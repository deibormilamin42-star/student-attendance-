const router = require('express').Router();
const pool = require('../db');
const { today, isDate, prettyDate } = require('../lib/dates');
const { toId } = require('../lib/util');

const VALID = new Set(['present', 'absent', 'late']);

function pickDate(v) {
  const t = today();
  return isDate(v) && v <= t ? v : t; // never allow future dates
}

router.get('/', async (req, res) => {
  const classes = (await pool.query('SELECT id, name FROM classes ORDER BY name')).rows;
  const classId = toId(req.query.class_id);
  const date = pickDate(req.query.date);
  const cls = classes.find((c) => c.id === classId) || null;

  let students = [];
  if (cls) {
    students = (await pool.query(
      `SELECT s.id, s.roll_no, s.name, a.status
       FROM students s
       LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $2::date
       WHERE s.class_id = $1
       ORDER BY LENGTH(s.roll_no), s.roll_no`, [cls.id, date])).rows;
  }
  res.render('attendance', {
    title: 'Mark attendance', active: 'attendance',
    classes, cls, date, students, marked: students.some((s) => s.status),
  });
});

router.post('/', async (req, res) => {
  const classId = toId(req.body.class_id);
  const date = pickDate(req.body.date);
  if (!classId) {
    req.flash('bad', 'Please choose a class first.');
    return res.redirect('/attendance');
  }

  const ids = (await pool.query('SELECT id FROM students WHERE class_id = $1', [classId])).rows.map((r) => r.id);
  const allowed = new Set(ids);

  const studentIds = [];
  const statuses = [];
  for (const [key, value] of Object.entries(req.body)) {
    const m = /^status_(\d{1,9})$/.exec(key);
    if (!m) continue;
    const sid = Number(m[1]);
    if (allowed.has(sid) && VALID.has(value)) {
      studentIds.push(sid);
      statuses.push(value);
    }
  }
  if (!studentIds.length) {
    req.flash('bad', 'No attendance was submitted.');
    return res.redirect(`/attendance?class_id=${classId}&date=${date}`);
  }

  await pool.query(
    `INSERT INTO attendance (student_id, date, status, marked_by)
     SELECT t.sid, $2::date, t.st, $4::int
     FROM unnest($1::int[], $3::text[]) AS t(sid, st)
     ON CONFLICT (student_id, date)
     DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
    [studentIds, date, statuses, req.session.user.id]);

  req.flash('ok', `Attendance saved for ${studentIds.length} students on ${prettyDate(date)}.`);
  res.redirect(`/attendance?class_id=${classId}&date=${date}`);
});

module.exports = router;
