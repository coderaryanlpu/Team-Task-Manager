const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './data.db' },
  useNullAsDefault: true,
});

async function init() {
  // users
  if (!await knex.schema.hasTable('users')) {
    await knex.schema.createTable('users', t => {
      t.increments('id');
      t.string('name').notNullable();
      t.string('email').unique().notNullable();
      t.string('password').notNullable();
      t.string('role').defaultTo('member');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!await knex.schema.hasTable('projects')) {
    await knex.schema.createTable('projects', t => {
      t.increments('id');
      t.string('name').notNullable();
      t.text('description');
      t.integer('owner_id').references('id').inTable('users');
      t.string('status').defaultTo('active');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!await knex.schema.hasTable('project_members')) {
    await knex.schema.createTable('project_members', t => {
      t.integer('project_id').references('id').inTable('projects').onDelete('CASCADE');
      t.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.string('role').defaultTo('member');
      t.primary(['project_id', 'user_id']);
    });
  }

  if (!await knex.schema.hasTable('tasks')) {
    await knex.schema.createTable('tasks', t => {
      t.increments('id');
      t.string('title').notNullable();
      t.text('description');
      t.integer('project_id').references('id').inTable('projects').onDelete('CASCADE');
      t.integer('assigned_to').references('id').inTable('users');
      t.integer('created_by').references('id').inTable('users');
      t.string('status').defaultTo('todo');
      t.string('priority').defaultTo('medium');
      t.date('due_date');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // seed demo data
  const count = await knex('users').count('id as c').first();
  if (count.c === 0) {
    const bcrypt = require('bcryptjs');
    const [adminId] = await knex('users').insert({ name: 'Alex (Admin)', email: 'admin@demo.com', password: bcrypt.hashSync('admin123', 10), role: 'admin' });
    const [uid1]    = await knex('users').insert({ name: 'Jordan',       email: 'jordan@demo.com', password: bcrypt.hashSync('member123', 10), role: 'member' });
    const [uid2]    = await knex('users').insert({ name: 'Casey',        email: 'casey@demo.com',  password: bcrypt.hashSync('member123', 10), role: 'member' });

    const [p1] = await knex('projects').insert({ name: 'Website Redesign', description: 'Revamp the company site with new branding', owner_id: adminId });
    const [p2] = await knex('projects').insert({ name: 'Mobile App v2',    description: 'React Native app — second major release',   owner_id: adminId });

    for (const pid of [p1, p2]) {
      await knex('project_members').insert([
        { project_id: pid, user_id: adminId, role: 'manager' },
        { project_id: pid, user_id: uid1,    role: 'member' },
        { project_id: pid, user_id: uid2,    role: 'member' },
      ]);
    }

    const d = (n) => {
      const dt = new Date(); dt.setDate(dt.getDate() + n);
      return dt.toISOString().split('T')[0];
    };

    await knex('tasks').insert([
      { title: 'Design homepage mockup',  description: 'Figma wireframes first', project_id: p1, assigned_to: uid1,    created_by: adminId, status: 'in_progress', priority: 'high',   due_date: d(2)  },
      { title: 'Set up CI/CD pipeline',   description: 'GitHub Actions',         project_id: p1, assigned_to: uid2,    created_by: adminId, status: 'todo',        priority: 'medium', due_date: d(5)  },
      { title: 'Write unit tests',        description: '80% coverage minimum',   project_id: p1, assigned_to: uid1,    created_by: adminId, status: 'todo',        priority: 'low',    due_date: d(-1) },
      { title: 'Auth screen UI',          description: 'Login + signup flows',   project_id: p2, assigned_to: uid2,    created_by: adminId, status: 'done',        priority: 'high',   due_date: d(-3) },
      { title: 'Push notifications',      description: 'Firebase integration',   project_id: p2, assigned_to: uid1,    created_by: adminId, status: 'in_progress', priority: 'medium', due_date: d(7)  },
      { title: 'App store screenshots',   description: 'All 4 device sizes',     project_id: p2, assigned_to: uid2,    created_by: adminId, status: 'todo',        priority: 'low',    due_date: d(10) },
    ]);

    console.log('Demo data seeded → admin@demo.com / admin123');
  }
}

module.exports = { knex, init };
