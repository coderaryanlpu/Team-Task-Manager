import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

export default function Dashboard() {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/tasks'), api.get('/projects')])
      .then(([tasks, projs]) => {
        setMyTasks(tasks);
        setProjects(projs);
      })
      .finally(() => setLoading(false));
  }, []);

  const overdue = myTasks.filter(t => isOverdue(t.due_date) && t.status !== 'done');
  const done = myTasks.filter(t => t.status === 'done');
  const dueToday = myTasks.filter(t => t.due_date === new Date().toISOString().split('T')[0] && t.status !== 'done');

  const stats = [
    { label: 'My Tasks', value: myTasks.length, sub: 'total assigned', color: 'var(--accent)' },
    { label: 'Due Today', value: dueToday.length, sub: 'need attention', color: 'var(--amber)' },
    { label: 'Overdue', value: overdue.length, sub: 'past deadline', color: 'var(--red)' },
    { label: 'Completed', value: done.length, sub: 'tasks done', color: 'var(--green)' },
  ];

  if (loading) return <div className="page-content" style={{ color: 'var(--txt2)' }}>Loading…</div>;

  return (
    <>
      <div className="topbar">
        <h1>Dashboard</h1>
        <span className="text-muted text-sm">👋 Hey, {user?.name?.split(' ')[0]}</span>
      </div>
      <div className="page-content fade-in">
        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.label} className="stat-card" style={{ '--accent-color': s.color }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="dash-grid">
          {/* My Tasks */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">My Tasks</span>
              <span className="text-muted text-sm">{myTasks.length} total</span>
            </div>
            {myTasks.length === 0 ? (
              <div className="empty"><div className="empty-icon">🎉</div><p>No tasks assigned to you yet.</p></div>
            ) : myTasks.map(task => (
              <div key={task.id} className="task-list-item" onClick={() => nav(`/projects/${task.project_id}`)}>
                <span className={`dot dot-${task.status}`} style={{ marginTop: 6, flexShrink: 0 }} />
                <div className="task-list-info">
                  <div className="task-list-title">{task.title}</div>
                  <div className="task-list-project">{task.project_name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  {task.due_date && (
                    <span className={`task-due ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}>
                      {isOverdue(task.due_date) && task.status !== 'done' ? '⚠' : '🗓'} {task.due_date}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Projects sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="section-header">
                <span className="section-title">Projects</span>
                <span className="text-muted text-sm">{projects.length}</span>
              </div>
              {projects.length === 0 ? (
                <div className="empty"><div className="empty-icon">🗂️</div><p>No projects yet.</p></div>
              ) : projects.map(p => {
                const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
                return (
                  <div key={p.id} style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => nav(`/projects/${p.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--txt3)' }}>{p.done_count}/{p.task_count} tasks · {pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
