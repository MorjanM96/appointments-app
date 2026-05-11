// Browser-side fallback "database" for demo mode (when no backend is configured).
// Persists data in localStorage so refreshing the page keeps the appointments.

const APPTS_KEY = 'demo.appointments';
const USERS_KEY = 'demo.users';
const SESSION_KEY = 'demo.session';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedIfEmpty() {
  if (!localStorage.getItem(APPTS_KEY)) {
    writeJSON(APPTS_KEY, [
      { id: 1, title: 'Team standup',     clientName: 'Engineering team', date: '2026-05-12', time: '09:30', notes: 'Weekly sync',     createdByName: 'Admin (demo)' },
      { id: 2, title: 'Dentist',          clientName: 'Dr. Khalil',       date: '2026-05-13', time: '14:00', notes: 'Routine checkup', createdByName: 'Admin (demo)' },
      { id: 3, title: 'Client demo',      clientName: 'Acme Corp',        date: '2026-05-14', time: '11:00', notes: 'Show new dashboard features', createdByName: 'Admin (demo)' },
      { id: 4, title: 'Lunch with Sara',  clientName: 'Sara Hassan',      date: '2026-05-15', time: '12:30', notes: 'Discuss partnership', createdByName: 'Admin (demo)' },
      { id: 5, title: 'Quarterly review', clientName: 'Leadership',       date: '2026-05-18', time: '15:00', notes: 'Q2 numbers',      createdByName: 'Admin (demo)' },
    ]);
  }
  if (!localStorage.getItem(USERS_KEY)) {
    writeJSON(USERS_KEY, [{ id: 1, username: 'admin', displayName: 'Admin (demo)', password: 'admin123' }]);
  }
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function sortAppointments(items) {
  return [...items].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

export const demoStorage = {
  // ---- auth ----
  login(username, password) {
    seedIfEmpty();
    const users = readJSON(USERS_KEY, []);
    const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid username or password');
    const session = { token: `demo.${user.id}.${Date.now()}`, user: { id: user.id, username: user.username, displayName: user.displayName } };
    writeJSON(SESSION_KEY, session);
    return session;
  },

  register(username, password, displayName) {
    seedIfEmpty();
    const users = readJSON(USERS_KEY, []);
    if (users.some((u) => u.username.toLowerCase() === String(username).toLowerCase())) {
      throw new Error('username is already taken');
    }
    const id = nextId(users);
    const user = { id, username, password, displayName: displayName || username };
    users.push(user);
    writeJSON(USERS_KEY, users);
    const session = { token: `demo.${id}.${Date.now()}`, user: { id, username, displayName: user.displayName } };
    writeJSON(SESSION_KEY, session);
    return session;
  },

  currentSession() {
    return readJSON(SESSION_KEY, null);
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },

  // ---- appointments ----
  listAppointments() {
    seedIfEmpty();
    return sortAppointments(readJSON(APPTS_KEY, []));
  },

  createAppointment(data) {
    seedIfEmpty();
    const items = readJSON(APPTS_KEY, []);
    const session = readJSON(SESSION_KEY, null);
    const appt = {
      id: nextId(items),
      title: data.title,
      clientName: data.clientName || '',
      date: data.date,
      time: data.time,
      notes: data.notes || '',
      createdByName: session?.user?.displayName || 'Demo user',
    };
    items.push(appt);
    writeJSON(APPTS_KEY, items);
    return appt;
  },

  updateAppointment(id, patch) {
    const items = readJSON(APPTS_KEY, []);
    const idx = items.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');
    items[idx] = { ...items[idx], ...patch };
    writeJSON(APPTS_KEY, items);
    return items[idx];
  },

  deleteAppointment(id) {
    const items = readJSON(APPTS_KEY, []);
    const idx = items.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');
    const [removed] = items.splice(idx, 1);
    writeJSON(APPTS_KEY, items);
    return removed;
  },

  resetAll() {
    localStorage.removeItem(APPTS_KEY);
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(SESSION_KEY);
    seedIfEmpty();
  },
};
