import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const emptyForm = { title: '', clientName: '', date: '', time: '', notes: '' };

export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAppointments();
      setAppointments(data);
    } catch (e) {
      setError(`Could not load appointments. Is the backend running? (${e.message})`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title || !form.date || !form.time) {
      setError('Title, date and time are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createAppointment(form);
      setForm(emptyForm);
      await loadAppointments();
    } catch (e) {
      setError(`Could not save appointment: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
      await api.deleteAppointment(id);
      await loadAppointments();
    } catch (e) {
      setError(`Could not delete appointment: ${e.message}`);
    }
  }

  const grouped = useMemo(() => groupByDate(appointments), [appointments]);

  return (
    <div className="page">
      <header>
        <h1>📅 Appointments</h1>
        <p className="subtitle">Schedule and track upcoming meetings.</p>
      </header>

      <section className="card">
        <h2>New appointment</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Project kickoff"
              required
            />
          </label>
          <label>
            Client / person
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="e.g. Acme Corp"
            />
          </label>
          <div className="row">
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </label>
          </div>
          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes"
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add appointment'}
          </button>
        </form>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <h2>Upcoming</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : appointments.length === 0 ? (
          <p className="muted">No appointments yet. Add your first one above.</p>
        ) : (
          <div className="groups">
            {grouped.map(({ date, items }) => (
              <div key={date} className="group">
                <h3>{formatDateHeading(date)}</h3>
                <ul>
                  {items.map((appt) => (
                    <li key={appt.id} className="appt">
                      <div className="appt-time">{appt.time}</div>
                      <div className="appt-body">
                        <div className="appt-title">{appt.title}</div>
                        {appt.clientName && (
                          <div className="appt-client">{appt.clientName}</div>
                        )}
                        {appt.notes && (
                          <div className="appt-notes">{appt.notes}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleDelete(appt.id)}
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <small>
          Backend: <code>{import.meta.env.VITE_API_URL || 'http://localhost:3001'}</code>
        </small>
      </footer>
    </div>
  );
}

function groupByDate(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date).push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => a.time.localeCompare(b.time)),
    }));
}

function formatDateHeading(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
