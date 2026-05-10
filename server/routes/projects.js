const router = require('express').Router();
const { knex } = require('../db');
const { auth } = require('../middleware/auth');

router.use(auth);

const membership = (projectId, userId) =>
  knex('project_members').where({ project_id: projectId, user_id: userId }).first();

const projectWithStats = () =>
  knex('projects as p')
    .join('users as u', 'p.owner_id', 'u.id')
    .select(
      'p.*', 'u.name as owner_name',
      knex.raw('(SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count'),
      knex.raw("(SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count"),
      knex.raw('(SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count')
    );

router.get('/', async (req, res) => {
  let q = projectWithStats().orderBy('p.created_at', 'desc');
  if (req.user.role !== 'admin') {
    const ids = await knex('project_members').where({ user_id: req.user.id }).pluck('project_id');
    q = q.whereIn('p.id', ids);
  }
  res.json(await q);
});

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create projects' });
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  const [id] = await knex('projects').insert({ name, description: description || '', owner_id: req.user.id });
  await knex('project_members').insert({ project_id: id, user_id: req.user.id, role: 'manager' });
  res.status(201).json(await knex('projects').where({ id }).first());
});

router.get('/:id', async (req, res) => {
  const project = await knex('projects as p').join('users as u', 'p.owner_id', 'u.id').select('p.*', 'u.name as owner_name').where('p.id', req.params.id).first();
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin' && !await membership(req.params.id, req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const members = await knex('project_members as pm')
    .join('users as u', 'pm.user_id', 'u.id')
    .select('u.id', 'u.name', 'u.email', 'u.role as global_role', 'pm.role as project_role')
    .where('pm.project_id', req.params.id);

  res.json({ ...project, members });
});

router.put('/:id', async (req, res) => {
  const project = await knex('projects').where({ id: req.params.id }).first();
  if (!project) return res.status(404).json({ error: 'Not found' });

  if (req.user.role !== 'admin') {
    const m = await membership(req.params.id, req.user.id);
    if (!m || m.role !== 'manager') return res.status(403).json({ error: 'Not authorized' });
  }

  const updates = {};
  if (req.body.name)        updates.name        = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.status)      updates.status      = req.body.status;

  await knex('projects').where({ id: req.params.id }).update(updates);
  res.json(await knex('projects').where({ id: req.params.id }).first());
});

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await knex('projects').where({ id: req.params.id }).delete();
  res.json({ ok: true });
});

router.post('/:id/members', async (req, res) => {
  if (req.user.role !== 'admin') {
    const m = await membership(req.params.id, req.user.id);
    if (!m || m.role !== 'manager') return res.status(403).json({ error: 'Not authorized' });
  }
  const { user_id, role } = req.body;
  await knex('project_members').insert({ project_id: req.params.id, user_id, role: role || 'member' }).onConflict(['project_id', 'user_id']).merge();
  res.json({ ok: true });
});

router.delete('/:id/members/:uid', async (req, res) => {
  if (req.user.role !== 'admin') {
    const m = await membership(req.params.id, req.user.id);
    if (!m || m.role !== 'manager') return res.status(403).json({ error: 'Not authorized' });
  }
  await knex('project_members').where({ project_id: req.params.id, user_id: req.params.uid }).delete();
  res.json({ ok: true });
});

module.exports = router;
