// Optional demo data for screenshots and your presentation.
//   node sql/demo.js          -> adds 2 demo classes, 24 students, ~3 weeks of attendance
//   node sql/demo.js --clear  -> removes everything it added
const pool = require('../db');
const { today, addDays } = require('../lib/dates');

const FIRST = ['Daniel', 'Priya', 'Rahul', 'Banri', 'Anita', 'Ibadahun', 'Emika', 'Sanjay', 'Rina', 'Wanbha', 'Kynsai', 'Meera'];
const LAST = ['Lyngdoh', 'Sharma', 'Das', 'Marbaniang', 'Roy', 'Khongwir', 'Nongrum', 'Rynjah', 'Syiem', 'Dkhar', 'Pariat', 'Basumatary'];
const CLASSES = [
  { name: 'BCA Sem 5 (Demo)', prefix: 'B5' },
  { name: 'MCA Sem 1 (Demo)', prefix: 'M1' },
];

(async () => {
  if (process.argv.includes('--clear')) {
    await pool.query(`DELETE FROM students WHERE class_id IN (SELECT id FROM classes WHERE name LIKE '%(Demo)')`);
    await pool.query(`DELETE FROM classes WHERE name LIKE '%(Demo)'`);
    console.log('Demo data removed.');
    return pool.end();
  }

  const adminId = (await pool.query(`SELECT id FROM users ORDER BY id LIMIT 1`)).rows[0]?.id || null;
  const ids = [], dates = [], statuses = [];
  const t = today();

  for (const [ci, c] of CLASSES.entries()) {
    const cls = (await pool.query(
      `INSERT INTO classes (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [c.name])).rows[0];

    for (let i = 0; i < 12; i++) {
      const roll = `${c.prefix}${String(i + 1).padStart(2, '0')}`;
      const name = `${FIRST[(i + ci * 5) % 12]} ${LAST[(i * 7 + ci * 3) % 12]}`;
      const st = (await pool.query(
        `INSERT INTO students (roll_no, name, class_id) VALUES ($1, $2, $3)
         ON CONFLICT (roll_no) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [roll, name, cls.id])).rows[0];

      const presentRate = i === 3 ? 0.55 : i === 8 ? 0.65 : 0.9; // a couple of low-attendance students
      for (let d = 0; d < 21; d++) {
        const date = addDays(t, -d);
        const dow = new Date(date + 'T00:00:00Z').getUTCDay();
        if (dow === 0 || dow === 6) continue;
        const r = Math.random();
        ids.push(st.id);
        dates.push(date);
        statuses.push(r < presentRate ? 'present' : r < presentRate + (1 - presentRate) / 3 ? 'late' : 'absent');
      }
    }
  }

  await pool.query(
    `INSERT INTO attendance (student_id, date, status, marked_by)
     SELECT t.sid, t.d::date, t.st, $4::int
     FROM unnest($1::int[], $2::text[], $3::text[]) AS t(sid, d, st)
     ON CONFLICT (student_id, date) DO NOTHING`,
    [ids, dates, statuses, adminId]);

  console.log(`Demo data added (${ids.length} attendance records).`);
  await pool.end();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
