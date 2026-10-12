const router = require('express').Router();
const pool = require('../db');
const { today, addDays, weekday } = require('../lib/dates');
const { LOW } = require('../lib/util');

const ATTENDED = `status IN ('present','late')`;

router.get('/', async (req, res) => {
  const t = today();
  const from = addDays(t, -6);

  const [totals, todayRows, trend, byClass, low] = await Promise.all([
    pool.query(`SELECT (SELECT COUNT(*) FROM students) AS students,
                       (SELECT COUNT(*) FROM classes) AS classes,
                       (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ${ATTENDED}) / NULLIF(COUNT(*), 0), 1)::float8 FROM attendance) AS pct`),
    pool.query(`SELECT status, COUNT(*) AS n FROM attendance WHERE date = $1::date GROUP BY status`, [t]),
    pool.query(`SELECT date, ROUND(100.0 * COUNT(*) FILTER (WHERE ${ATTENDED}) / COUNT(*), 1)::float8 AS pct
                FROM attendance WHERE date BETWEEN $1::date AND $2::date GROUP BY date ORDER BY date`, [from, t]),
    pool.query(`SELECT c.id, c.name, COUNT(DISTINCT s.id) AS students,
                       COUNT(a.id) AS marked,
                       COUNT(a.id) FILTER (WHERE a.status = 'present') AS present,
                       COUNT(a.id) FILTER (WHERE a.status = 'late') AS late,
                       COUNT(a.id) FILTER (WHERE a.status = 'absent') AS absent
                FROM classes c
                LEFT JOIN students s ON s.class_id = c.id
                LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1::date
                GROUP BY c.id ORDER BY c.name`, [t]),
    pool.query(`SELECT s.id, s.name, s.roll_no, c.name AS class_name,
                       ROUND(100.0 * COUNT(*) FILTER (WHERE a.${ATTENDED}) / COUNT(*), 1)::float8 AS pct
                FROM students s
                JOIN attendance a ON a.student_id = s.id
                LEFT JOIN classes c ON c.id = s.class_id
                GROUP BY s.id, c.name
                HAVING 100.0 * COUNT(*) FILTER (WHERE a.${ATTENDED}) / COUNT(*) < $1
                ORDER BY pct ASC LIMIT 5`, [LOW]),
  ]);

  const stats = { present: 0, absent: 0, late: 0 };
  todayRows.rows.forEach((r) => { stats[r.status] = r.n; });

  const map = new Map(trend.rows.map((r) => [r.date, r.pct]));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    days.push({ date: d, label: weekday(d), pct: map.has(d) ? map.get(d) : null });
  }

  res.render('dashboard', {
    title: 'Dashboard', active: 'dashboard',
    totals: totals.rows[0], stats, days, byClass: byClass.rows, low: low.rows,
  });
});

module.exports = router;
