const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { clean, notFound } = require('../lib/util');

router.use(requireAdmin);
router.param('id', (req, res, next, v) => (/^\d{1,9}$/.test(v) ? next() : next('route')));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, role FROM users ORDER BY role, name');
  res.render('users', { title: 'Users', active: 'users', users: rows, form: { name: '', email: '', role: 'teacher' }, error: null });
});

router.post('/', async (req, res) => {
  const form = {
    name: clean(req.body.name, 80),
    email: clean(req.body.email, 120).toLowerCase(),
    role: req.body.role === 'admin' ? 'admin' : 'teacher',
  };
  const password = String(req.body.password || '');
  const show = async (error) => {
    const { rows } = await pool.query('SELECT id, name, email, role FROM users ORDER BY role, name');
    return res.status(400).render('users', { title: 'Users', active: 'users', users: rows, form, error });
  };

  if (!form.name) return show('Name is required.');
  if (!EMAIL.test(form.email)) return show('Enter a valid email address.');
  if (password.length < 8) return show('Password must be at least 8 characters.');

  try {
    await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [form.name, form.email, await bcrypt.hash(password, 10), form.role]);
  } catch (e) {
    if (e.code === '23505') return show('A user with that email already exists.');
    throw e;
  }
  req.flash('ok', `User ${form.name} created.`);
  res.redirect('/users');
});

router.post('/:id/password', async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 8) {
    req.flash('bad', 'Password must be at least 8 characters.');
    return res.redirect('/users');
  }
  const r = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2',
    [await bcrypt.hash(password, 10), req.params.id]);
  if (!r.rowCount) return notFound(res, 'user');
  req.flash('ok', 'Password updated.');
  res.redirect('/users');
});

router.post('/:id/delete', async (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    req.flash('bad', 'You cannot delete your own account.');
    return res.redirect('/users');
  }
  await pool.query('UPDATE attendance SET marked_by = NULL WHERE marked_by = $1', [req.params.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  req.flash('ok', 'User deleted.');
  res.redirect('/users');
});

module.exports = router;
