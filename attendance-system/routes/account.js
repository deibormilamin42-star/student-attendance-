const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');

router.get('/', (req, res) =>
  res.render('account', { title: 'My account', active: 'account', error: null }));

router.post('/password', async (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.password || '');
  const confirm = String(req.body.confirm || '');
  const show = (error) => res.status(400).render('account', { title: 'My account', active: 'account', error });

  if (next.length < 8) return show('New password must be at least 8 characters.');
  if (next !== confirm) return show('The new passwords do not match.');

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.session.user.id]);
  if (!rows[0] || !(await bcrypt.compare(current, rows[0].password_hash))) return show('Your current password is incorrect.');

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 10), req.session.user.id]);
  req.flash('ok', 'Password changed.');
  res.redirect('/account');
});

module.exports = router;
