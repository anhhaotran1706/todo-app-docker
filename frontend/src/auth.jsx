import { useState } from 'react';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [needsVerify, setNeedsVerify] = useState(false);
  const verified = new URLSearchParams(window.location.search).get('verified');

  const post = async (path, body) => {
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setNeedsVerify(false);
    try {
      const { ok, data } = await post(mode, { email, password });
      if (!ok) { setError(data.error || 'Something went wrong'); setNeedsVerify(!!data.needsVerify); return; }
      if (mode === 'register') { setMsg(data.message); setMode('login'); setPassword(''); }
      else onLogin(data.token, data.email, data.verified);
    } catch {
      setError('Cannot reach the server');
    }
  };

  const resend = async () => {
    const { data } = await post('resend', { email });
    setMsg(data.message); setError(''); setNeedsVerify(false);
  };

  return (
    <div className="app auth">
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      {verified === '1' && <p className="ok">E-mail verified. You can log in now.</p>}
      {verified === '0' && <p className="error">Verification link is invalid or expired.</p>}
      <form onSubmit={submit}>
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{mode === 'login' ? 'Log in' : 'Register'}</button>
      </form>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
      {needsVerify && <button onClick={resend}>Resend verification e-mail</button>}
      <p>
        {mode === 'login' ? 'No account? ' : 'Already registered? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMsg(''); }}>
          {mode === 'login' ? 'Register' : 'Log in'}
        </a>
      </p>
    </div>
  );
}