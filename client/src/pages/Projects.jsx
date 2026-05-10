import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const p = await api.post('/projects', form);
      onCreate(p);
      onClose();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">New project</div>
        {err && <div className="auth-error">⚠️ {err}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Project name</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Website Redesign" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="What's this project about?" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.get('/projects').then(setProjects).finally(() => setLoading(false));
  }, []);

  function handleCreate(p) {
    setProjects(prev => [p, ...prev]);
  }

  if (loading) return <div className="page-content" style={{ color: 'var(--txt2)' }}>Loading…</div>;

  return (
    <>
      <div className="topbar">
        <h1>Projects</h1>
        {user?.role === 'admin' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New project</button>
        )}
      </div>
      <div className="page-content fade-in">
        {projects.length === 0 ? (
          <div className="empty card" style={{ marginTop: 40 }}>
            <div className="empty-icon">🗂️</div>
            <p>No projects yet. {user?.role === 'admin' ? 'Create one above!' : 'Ask an admin to add you to a project.'}</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <div key={p.id} className="project-card" onClick={() => nav(`/projects/${p.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div className="project-card-name">{p.name}</div>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </div>
                  <div className="project-card-desc">{p.description || 'No description'}</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="project-card-footer">
                    <span className="text-sm text-muted">{p.done_count}/{p.task_count} done · {pct}%</span>
                    <span className="text-sm text-muted">👥 {p.member_count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </>
  );
}
