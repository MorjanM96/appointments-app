import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import { fetchCurrentUser, logout } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const current = await fetchCurrentUser();
        setUser(current);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  if (initializing) {
    return (
      <div className="auth-page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (user) {
    return (
      <AppointmentsPage
        user={user}
        onLogout={() => {
          logout();
          setUser(null);
          setAuthView('login');
        }}
      />
    );
  }

  if (authView === 'register') {
    return (
      <RegisterPage
        onAuth={(u) => setUser(u)}
        onSwitchToLogin={() => setAuthView('login')}
      />
    );
  }

  return (
    <LoginPage
      onAuth={(u) => setUser(u)}
      onSwitchToRegister={() => setAuthView('register')}
    />
  );
}
