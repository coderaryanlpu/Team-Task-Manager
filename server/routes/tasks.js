const router = require('express').Router();
const { knex } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

const getMembership = (pid, uid) =>
  knex('project_members').where({ project_id: pid, user_id: uid }).first();

router.get('/', async (req, res) => {
  const { project_id } = req.query;

  if (!project_id) {
    const tasks = await knex('tasks as t')
      .leftJoin('users as u', 't.assigned_to', 'u.id')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .select('t.*', 'u.name as assignee_name', 'p.name as project_name')
      .where('t.assigned_to', req.user.id)
      .orderBy([{ column: 't.due_date', order: 'asc' }, { column: 't.created_at', order: 'desc' }]);
    return res.json(tasks);
  }

  if (req.user.role !== 'admin' && !await getMembership(project_id, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tasks = await knex('tasks as t')
    .leftJoin('users as u', 't.assigned_to', 'u.id')
    .leftJoin('users as u2', 't.created_by', 'u2.id')
    .select('t.*', 'u.name as assignee_name', 'u2.name as creator_name')
    .where('t.project_id', project_id)
    .orderBy('t.created_at', 'desc');

  res.json(tasks);
});

router.post('/', async (req, res) => {
  const { title, description, project_id, assigned_to, status, priority, due_date } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'Title and project required' });

  if (req.user.role !== 'admin') {
    const m = await getMembership(project_id, req.user.id);
    if (!m) return res.status(403).json({ error: 'Access denied' });
    if (assigned_to && Number(assigned_to) !== req.user.id && m.role !== 'manager') {
      return res.status(403).json({ error: 'Members can only self-assign tasks' });
    }
  }

  const [id] = await knex('tasks').insert({
    title, description: description || '', project_id,
    assigned_to: assigned_to || req.user.id,
    created_by: req.user.id,
    status: status || 'todo',
    priority: priority || 'medium',
    due_date: due_date || null,
  });

  const task = await knex('tasks as t').leftJoin('users as u', 't.assigned_to', 'u.id').select('t.*', 'u.name as assignee_name').where('t.id', id).first();
  res.status(201).json(task);
});

router.put('/:id', async (req, res) => {
  const task = await knex('tasks').where({ id: req.params.id }).first();
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role !== 'admin') {
    const m = await getMembership(task.project_id, req.user.id);
    if (!m) return res.status(403).json({ error: 'Access denied' });
    if (m.role === 'member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }
  }

  const updates = {};
  const fields = ['title', 'description', 'assigned_to', 'status', 'priority', 'due_date'];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  await knex('tasks').where({ id: req.params.id }).update(updates);
  const updated = await knex('tasks as t').leftJoin('users as u', 't.assigned_to', 'u.id').select('t.*', 'u.name as assignee_name').where('t.id', req.params.id).first();
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const task = await knex('tasks').where({ id: req.params.id }).first();
  if (!task) return res.status(404).json({ error: 'Not found' });

  if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
    const m = await getMembership(task.project_id, req.user.id);
    if (!m || m.role !== 'manager') return res.status(403).json({ error: 'Not authorized' });
  }

  await knex('tasks').where({ id: req.params.id }).delete();
  res.json({ ok: true });
});

module.exports = router;
