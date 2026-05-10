const router = require('express').Router();
const { knex } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  const users = await knex('users').select('id', 'name', 'email', 'role', 'created_at').orderBy('name');
  res.json(users);
});

router.put('/:id/role', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  await knex('users').where({ id: req.params.id }).update({ role });
  res.json({ ok: true });
});

module.exports = router;
