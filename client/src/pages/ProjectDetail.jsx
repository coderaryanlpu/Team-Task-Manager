import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const COLS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

function initials(name = '') {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function TaskModal({ task, members, projectId, currentUser, onClose, onSave, onDelete }) {
  const isNew = !task;
  const canAssignOthers = currentUser.role === 'admin' || members.find(m => m.id === currentUser.id)?.project_role === 'manager';

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || currentUser.id,
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    project_id: projectId,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const payload = { ...form, due_date: form.due_date || null };
      const saved = isNew ? await api.post('/tasks', payload) : await api.put(`/tasks/${task.id}`, payload);
      onSave(saved, isNew);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this task?')) return;
    await api.del(`/tasks/${task.id}`);
    onDelete(task.id);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{isNew ? 'New task' : 'Edit task'}</div>
        {err && <div className="auth-error">⚠️ {err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input value={form.title} onChange={set('title')} placeholder="What needs to be done?" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="More details…" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned to</label>
              <select value={form.assigned_to} onChange={set('assigned_to')} disabled={!canAssignOthers}>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due date</label>
              <input type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>
          <div className="modal-actions">
            {!isNew && (currentUser.role === 'admin' || task.created_by === currentUser.id) && (
              <button type="button" className="btn btn-danger btn-sm" onClick={remove}>Delete</button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/users').then(setUsers); }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { user_id: Number(userId), role });
      onAdd();
      onClose();
    } catch { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add member</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">User</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} required>
              <option value="">Select a user…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object
  const [memberModal, setMemberModal] = useState(false);

  async function load() {
    const [proj, taskList] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks?project_id=${id}`)
    ]);
    setProject(proj);
    setTasks(taskList);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  const isManagerOrAdmin = user?.role === 'admin' || project?.members?.find(m => m.id === user?.id)?.project_role === 'manager';

  function handleTaskSave(saved, isNew) {
    if (isNew) {
      setTasks(t => [saved, ...t]);
    } else {
      setTasks(t => t.map(x => x.id === saved.id ? saved : x));
    }
  }

  function handleTaskDelete(taskId) {
    setTasks(t => t.filter(x => x.id !== taskId));
  }

  if (loading) return <div className="page-content" style={{ color: 'var(--txt2)' }}>Loading…</div>;
  if (!project) return <div className="page-content">Project not found.</div>;

  const byStatus = (s) => tasks.filter(t => t.status === s);

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => nav('/projects')} style={{ background: 'none', border: 'none', color: 'var(--txt2)', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>←</button>
          <div>
            <h1>{project.name}</h1>
            {project.description && <p style={{ fontSize: 12.5, color: 'var(--txt2)', marginTop: 2 }}>{project.description}</p>}
          </div>
          <span className={`badge badge-${project.status}`}>{project.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isManagerOrAdmin && (
            <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal(true)}>+ Member</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>+ Task</button>
        </div>
      </div>

      <div className="page-content fade-in">
        {/* Members row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 12.5, color: 'var(--txt2)', fontWeight: 500 }}>Team:</span>
          <div className="member-stack">
            {project.members?.map(m => (
              <div key={m.id} className="avatar sm" title={`${m.name} · ${m.project_role}`}>{initials(m.name)}</div>
            ))}
          </div>
          {project.members?.map(m => (
            <span key={m.id} style={{ fontSize: 12, color: 'var(--txt2)' }}>{m.name} <span className="role-chip">{m.project_role}</span></span>
          ))}
        </div>

        {/* Kanban board */}
        <div className="kanban">
          {COLS.map(col => {
            const colTasks = byStatus(col.key);
            return (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-header">
                  <span className={`dot dot-${col.key}`} style={{ marginRight: 6 }} />
                  {col.label}
                  <span className="count">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className={`task-card ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}
                    onClick={() => setTaskModal(task)}
                  >
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.assignee_name && (
                        <span className="avatar sm" title={task.assignee_name}>{initials(task.assignee_name)}</span>
                      )}
                      {task.due_date && (
                        <span className={`task-due ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}>
                          🗓 {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: 12, padding: '20px 0' }}>No tasks here</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          members={project.members || []}
          projectId={Number(id)}
          currentUser={user}
          onClose={() => setTaskModal(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}
      {memberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setMemberModal(false)}
          onAdd={load}
        />
      )}
    </>
  );
}
