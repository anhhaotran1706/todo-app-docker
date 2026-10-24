import { useEffect, useState, useCallback } from 'react';
import Auth from './auth.jsx';

const API = '/api';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [servedBy, setServedBy] = useState('-');
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState(localStorage.getItem('email') || '');
  const [verified, setVerified] = useState(localStorage.getItem('verified') === 'true');
  const [verificationMessage, setVerificationMessage] = useState('');

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setToken(null); setTodos([]); setNotifications([]); setVerified(false);
  }, []);
  const onLogin = (t, e, isVerified) => {
    localStorage.setItem('token', t);
    localStorage.setItem('email', e);
    localStorage.setItem('verified', String(!!isVerified));
    setToken(t); setEmail(e); setVerified(!!isVerified);
    window.history.replaceState({}, '', '/');
  };

  // Wrapper that records which backend replica answered each request.
  const request = useCallback(async (path, options) => {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...options,
    });
    setServedBy(res.headers.get('X-Served-By') || '-');
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.status === 204 ? null : res.json();
  }, [token, logout]);

  const load = useCallback(async () => {
    try {
      setTodos(await request('/todos'));
      setNotifications(await request('/notifications'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [request]);

  useEffect(() => {
    if (!token) return;
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [token, load]);

  const act = async (fn) => {
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const addTodo = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    act(async () => {
      await request('/todos', { method: 'POST', body: JSON.stringify({ title, dueDate: dueDate || null }) });
      setTitle('');
      setDueDate('');
    });
  };

  const toggle = (t) => act(() => request(`/todos/${t._id}`, { method: 'PUT', body: JSON.stringify({ done: !t.done }) }));
  const remove = (t) => act(() => request(`/todos/${t._id}`, { method: 'DELETE' }));
  const resendVerification = async () => {
    try {
      const res = await fetch(`${API}/auth/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setVerificationMessage(data.message || 'Verification email requested.');
    } catch {
      setVerificationMessage('Could not request a verification email.');
    }
  };

  const rename = (t) => {
    const next = window.prompt('Edit task', t.title);
    if (next && next.trim()) act(() => request(`/todos/${t._id}`, { method: 'PUT', body: JSON.stringify({ title: next }) }));
  };

  if (!token) return <Auth onLogin={onLogin} />;
  const visible = todos.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done));

  return (
    <div className="app">
      {!verified && <div className="verification-banner">
        <span>Your email is not verified. Some account features may be limited.</span>
        <button onClick={resendVerification}>Resend verification email</button>
        {verificationMessage && <small>{verificationMessage}</small>}
      </div>}

      <header>
        <h1>Todo List</h1>
        <span>
          <span className="badge" title="Backend replica that served the last request">served by: {servedBy}</span>{' '}
          <small>{email}</small> <button onClick={logout}>Logout</button>
        </span>
      </header>

      <form onSubmit={addTodo} className="add">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <nav className="filters">
        {['all', 'active', 'done'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </nav>

      <ul className="todos">
        {visible.length === 0 && <li className="empty">No tasks yet.</li>}
        {visible.map((t) => (
          <li key={t._id} className={t.done ? 'done' : ''}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
            <span className="title">{t.title}</span>
            {t.dueDate && <span className="due">due {new Date(t.dueDate).toLocaleDateString()}</span>}
            <button onClick={() => rename(t)}>Edit</button>
            <button className="danger" onClick={() => remove(t)}>Delete</button>
          </li>
        ))}
      </ul>

      <section className="notifications">
        <h2>Notifications (processed by worker via Redis)</h2>
        <ul>
          {notifications.length === 0 && <li className="empty">No notifications yet.</li>}
          {notifications.map((n) => (
            <li key={n._id}>
              {n.message} <small>[{n.processedBy}]</small>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
