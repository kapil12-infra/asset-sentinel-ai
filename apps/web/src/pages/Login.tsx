import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth';
import { Icon } from '../components/icons';

export function AuthPage({ mode: initial }: { mode: 'login' | 'signup' }) {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState(initial);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      nav('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand"><Icon name="shield" /><div><b>Asset <span>Sentinel</span> AI</b><small>Build Studio</small></div></div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="lead">{mode === 'login' ? 'Sign in to build, test, secure and deploy.' : 'Start building in minutes.'}</p>
        <div className="oauth">
          <a className="btn sm" href={api.auth.oauthUrl('google')}>Google</a>
          <a className="btn sm" href={api.auth.oauthUrl('github')}>GitHub</a>
        </div>
        <div className="or">or with email</div>
        {mode === 'signup' && (
          <div className="fl"><label htmlFor="n">Full name</label><input id="n" className="fi" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></div>
        )}
        <div className="fl"><label htmlFor="e">Email</label><input id="e" type="email" className="fi" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div className="fl">
          <label htmlFor="p">Password</label>
          <div className="password-wrapper">
            <input
              id="p"
              type={showPassword ? 'text' : 'password'}
              className="fi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="password-eye"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="swap">
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <button type="button" onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login'); }}>
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}

export function OAuthCallback() {
  const [params] = useSearchParams();
  const { acceptToken } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const err = params.get('error');
    if (err || !token) { setError(err || 'Sign-in failed'); return; }
    acceptToken(token).then(() => nav('/', { replace: true })).catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth"><div className="auth-card">
      {error ? <><p className="err" role="alert">{error}</p><a className="btn primary" href="/login">Back to sign in</a></> : <p className="empty">Signing you in…</p>}
    </div></div>
  );
}

export function Login() {
  return <AuthPage mode="login" />;
}
