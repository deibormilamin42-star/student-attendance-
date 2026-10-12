// Creates the first admin. Run once:  node sql/seed.js
// Optional: ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in .env
const bcrypt = require('bcryptjs');
const pool = require('../db');

(async () => {
  const email = (process.env.ADMIN_EMAIL || 'admin@college.edu').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.ADMIN_NAME || 'Administrator';
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [name, email, await bcrypt.hash(password, 10)]);
  console.log('Admin ready:', email);
  await pool.end();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
