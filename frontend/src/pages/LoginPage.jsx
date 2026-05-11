import { useState } from 'react';
import { login, isDemoMode } from '../api.js';

export default function LoginPage({ onAuth, onSwitchToRegister }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      onAuth(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>📅 Appointments</h1>
        <p className="muted">Sign in to manage your schedule.</p>

        {isDemoMode && (
          <div className="demo-banner">
            <strong>Demo mode</strong> — data is stored only in your browser.
            Default account: <code>admin</code> / <code>admin123</code>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <span className="muted">No account yet?</span>{' '}
          <button type="button" className="link" onClick={onSwitchToRegister}>
            Create one
          </button>
        </div>
      </div>
    </div>
  );
}
