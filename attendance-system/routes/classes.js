const router = require('express').Router();
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { clean } = require('../lib/util');

router.param('id', (req, res, next, v) => (/^\d{1,9}$/.test(v) ? next() : next('route')));

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, COUNT(s.id) AS students
     FROM classes c LEFT JOIN students s ON s.class_id = c.id
     GROUP BY c.id ORDER BY c.name`);
  res.render('classes', { title: 'Classes', active: 'classes', classes: rows });
});

router.post('/', requireAdmin, async (req, res) => {
  const name = clean(req.body.name, 60);
  if (!name) {
    req.flash('bad', 'Class name is required.');
    return res.redirect('/classes');
  }
  try {
    await pool.query('INSERT INTO classes (name) VALUES ($1)', [name]);
    req.flash('ok', `Class "${name}" added.`);
  } catch (e) {
    if (e.code !== '23505') throw e;
    req.flash('bad', 'A class with that name already exists.');
  }
  res.redirect('/classes');
});

router.post('/:id/rename', requireAdmin, async (req, res) => {
  const name = clean(req.body.name, 60);
  if (!name) {
    req.flash('bad', 'Class name is required.');
    return res.redirect('/classes');
  }
  try {
    await pool.query('UPDATE classes SET name = $1 WHERE id = $2', [name, req.params.id]);
    req.flash('ok', 'Class renamed.');
  } catch (e) {
    if (e.code !== '23505') throw e;
    req.flash('bad', 'A class with that name already exists.');
  }
  res.redirect('/classes');
});

router.post('/:id/delete', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM classes WHERE id = $1', [req.params.id]);
  req.flash('ok', 'Class deleted. Its students are kept but are no longer assigned to a class.');
  res.redirect('/classes');
});

module.exports = router;
