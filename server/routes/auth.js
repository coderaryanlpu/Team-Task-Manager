const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { knex } = require('../db');
const { SECRET } = require('../middleware/auth');

router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  const [{ c }] = await knex('users').count('id as c');
  const finalRole = c === 0 ? 'admin' : (role === 'admin' ? 'admin' : 'member');
  const hash = bcrypt.hashSync(password, 10);

  try {
    const [id] = await knex('users').insert({ name, email, password: hash, role: finalRole });
    const user = await knex('users').select('id', 'name', 'email', 'role').where({ id }).first();
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await knex('users').where({ email }).first();
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

module.exports = router;
