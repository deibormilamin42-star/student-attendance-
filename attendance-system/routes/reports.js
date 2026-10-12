const router = require('express').Router();
const pool = require('../db');
const { today, isDate, isMonth, monthStart, daysInMonth, shiftMonth } = require('../lib/dates');
const { toId, LOW } = require('../lib/util');

const SUMMARY_SQL = `
  SELECT s.id, s.roll_no, s.name, c.name AS class_name,
         COUNT(a.id) FILTER (WHERE a.status = 'present') AS present,
         COUNT(a.id) FILTER (WHERE a.status = 'late') AS late,
         COUNT(a.id) FILTER (WHERE a.status = 'absent') AS absent,
         COUNT(a.id) AS total,
         ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status IN ('present','late')) / NULLIF(COUNT(a.id), 0), 1)::float8 AS pct
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  LEFT JOIN attendance a ON a.student_id = s.id AND a.date BETWEEN $2::date AND $3::date
  WHERE ($1::int IS NULL OR s.class_id = $1)
  GROUP BY s.id, c.name
  ORDER BY c.name NULLS LAST, LENGTH(s.roll_no), s.roll_no`;

function filters(q) {
  const t = today();
  let from = isDate(q.from) ? q.from : monthStart(t);
  let to = isDate(q.to) ? q.to : t;
  if (from > to) [from, to] = [to, from];
  return { classId: toId(q.class_id), from, to };
}

const getClasses = () => pool.query('SELECT id, name FROM classes ORDER BY name');

router.get('/', async (req, res) => {
  const f = filters(req.query);
  const [classes, rows] = await Promise.all([getClasses(), pool.query(SUMMARY_SQL, [f.classId, f.from, f.to])]);
  const withData = rows.rows.filter((r) => r.total > 0);
  const avg = withData.length
    ? Math.round((withData.reduce((a, r) => a + r.pct, 0) / withData.length) * 10) / 10
    : null;
  const qs = new URLSearchParams({ from: f.from, to: f.to });
  if (f.classId) qs.set('class_id', f.classId);

  res.render('reports', {
    title: 'Reports', active: 'reports', classes: classes.rows, rows: rows.rows, f, avg,
    lowCount: withData.filter((r) => r.pct < LOW).length, exportQuery: qs.toString(),
  });
});

const esc = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

router.get('/export.csv', async (req, res) => {
  const f = filters(req.query);
  const { rows } = await pool.query(SUMMARY_SQL, [f.classId, f.from, f.to]);
  const head = ['Roll No', 'Name', 'Class', 'Present', 'Late', 'Absent', 'Total days', 'Attendance %'];
  const lines = [head.map(esc).join(',')];
  rows.forEach((r) =>
    lines.push([r.roll_no, r.name, r.class_name, r.present, r.late, r.absent, r.total, r.pct == null ? '' : r.pct].map(esc).join(',')));
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="attendance_${f.from}_to_${f.to}.csv"`,
  });
  res.send('\uFEFF' + lines.join('\r\n'));
});

router.get('/monthly', async (req, res) => {
  const classes = (await getClasses()).rows;
  const classId = toId(req.query.class_id);
  const month = isMonth(req.query.month) ? req.query.month : today().slice(0, 7);
  const cls = classes.find((c) => c.id === classId) || null;
  const nDays = daysInMonth(month);
  const days = Array.from({ length: nDays }, (_, i) => {
    const d = `${month}-${String(i + 1).padStart(2, '0')}`;
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    return { n: i + 1, date: d, weekend: dow === 0 || dow === 6 };
  });

  let students = [];
  if (cls) {
    const [stu, att] = await Promise.all([
      pool.query('SELECT id, roll_no, name FROM students WHERE class_id = $1 ORDER BY LENGTH(roll_no), roll_no', [cls.id]),
      pool.query(
        `SELECT a.student_id, a.date, a.status FROM attendance a
         JOIN students s ON s.id = a.student_id
         WHERE s.class_id = $1 AND a.date BETWEEN $2::date AND $3::date`,
        [cls.id, `${month}-01`, `${month}-${String(nDays).padStart(2, '0')}`]),
    ]);
    const map = new Map();
    att.rows.forEach((r) => map.set(r.student_id + '|' + r.date, r.status));
    students = stu.rows.map((s) => {
      const cells = days.map((d) => map.get(s.id + '|' + d.date) || null);
      const present = cells.filter((c) => c === 'present').length;
      const late = cells.filter((c) => c === 'late').length;
      const absent = cells.filter((c) => c === 'absent').length;
      const total = present + late + absent;
      return { ...s, cells, present, late, absent, pct: total ? Math.round((1000 * (present + late)) / total) / 10 : null };
    });
  }
  res.render('monthly', {
    title: 'Monthly view', active: 'reports', classes, cls, month, days, students,
    prev: shiftMonth(month, -1), next: shiftMonth(month, 1),
  });
});

module.exports = router;
