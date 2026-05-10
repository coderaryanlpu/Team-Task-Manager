import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/signup';
      const payload = tab === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, role: form.role };
      const data = await api.post(endpoint, payload);
      login(data.user, data.token);
      nav('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-logo">
          <span>⚡</span> TaskFlow
        </div>
        <h1 className="auth-headline">
          Ship faster,<br /><em>together.</em>
        </h1>
        <p className="auth-tagline">
          Manage projects, assign work, and track progress — all in one place for your whole team.
        </p>
        <div className="auth-features">
          {[
            ['🗂️', 'Organize work into projects'],
            ['👥', 'Invite team members with roles'],
            ['📋', 'Track tasks on a kanban board'],
            ['📊', 'Dashboard with live stats'],
          ].map(([icon, text]) => (
            <div key={text} className="auth-feature">
              <div className="auth-feature-icon">{icon}</div>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap fade-in">
          <h2>{tab === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p>{tab === 'login' ? 'Sign in to your workspace' : 'Get started for free'}</p>

          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError(''); }}>Sign up</button>
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          <form onSubmit={submit}>
            {tab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
            </div>
            {tab === 'signup' && (
              <div className="form-group">
                <label className="form-label">Account type</label>
                <select value={form.role} onChange={set('role')}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>

          {tab === 'login' && (
            <p style={{ marginTop: 20, textAlign: 'center', color: 'var(--txt3)', fontSize: 12.5 }}>
              Demo: <strong style={{ color: 'var(--txt2)' }}>admin@demo.com</strong> / <strong style={{ color: 'var(--txt2)' }}>admin123</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
