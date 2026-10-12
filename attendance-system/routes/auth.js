const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const limiter = require('../middleware/rateLimit');

// Compared against when the email does not exist, so timing does not reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Login', error: null });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const key = req.ip + '|' + email;

  if (limiter.blocked(key)) {
    return res.status(429).render('login', { title: 'Login', error: 'Too many failed attempts. Please wait 15 minutes and try again.' });
  }

  const { rows } = await pool.query(
    'SELECT id, name, role, password_hash FROM users WHERE lower(email) = $1', [email]);
  const u = rows[0];
  const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);

  if (!u || !ok) {
    limiter.fail(key);
    return res.status(401).render('login', { title: 'Login', error: 'Invalid email or password' });
  }

  limiter.clear(key);
  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.user = { id: u.id, name: u.name, role: u.role };
  res.redirect('/dashboard');
});

router.post('/logout', async (req, res) => {
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('connect.sid');
  res.redirect('/login');
});

module.exports = router;
