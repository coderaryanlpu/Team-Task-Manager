import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(setUsers).finally(() => setLoading(false));
  }, []);

  async function toggleRole(u) {
    if (u.id === user.id) return alert("Can't change your own role");
    const newRole = u.role === 'admin' ? 'member' : 'admin';
    if (!confirm(`Make ${u.name} a ${newRole}?`)) return;
    await api.put(`/users/${u.id}/role`, { role: newRole });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
  }

  if (loading) return <div className="page-content" style={{ color: 'var(--txt2)' }}>Loading…</div>;

  return (
    <>
      <div className="topbar">
        <h1>Team</h1>
        <span className="text-muted text-sm">{users.length} members</span>
      </div>
      <div className="page-content fade-in">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar sm">{initials(u.name)}</div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                        {u.id === user.id && <span style={{ fontSize: 11, color: 'var(--txt3)' }}>(you)</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--txt2)' }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-done' : 'badge-todo'}`}>{u.role}</span></td>
                    <td style={{ color: 'var(--txt3)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    {user?.role === 'admin' && (
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleRole(u)}
                          disabled={u.id === user.id}
                        >
                          Make {u.role === 'admin' ? 'member' : 'admin'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
