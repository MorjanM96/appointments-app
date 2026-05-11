import { useEffect, useMemo, useState } from 'react';
import {
  listAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getBackendInfo,
} from '../api.js';

const emptyForm = { title: '', clientName: '', date: '', time: '', notes: '' };

export default function AppointmentsPage({ user, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editingDraft, setEditingDraft] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listAppointments();
      setAppointments(data);
    } catch (e) {
      setError(`Could not load appointments: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) {
      setError('Title, date and time are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAppointment({
        title: form.title.trim(),
        clientName: form.clientName.trim(),
        date: form.date,
        time: form.time,
        notes: form.notes.trim(),
      });
      setForm(emptyForm);
      await refresh();
    } catch (e) {
      setError(`Could not save appointment: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(appointment) {
    setEditing(appointment.id);
    setEditingDraft({
      title: appointment.title,
      clientName: appointment.clientName || '',
      date: appointment.date,
      time: appointment.time,
      notes: appointment.notes || '',
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditingDraft(emptyForm);
  }

  async function saveEdit() {
    if (!editingDraft.title.trim() || !editingDraft.date || !editingDraft.time) {
      setError('Title, date and time are required.');
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await updateAppointment(editing, {
        title: editingDraft.title.trim(),
        clientName: editingDraft.clientName.trim(),
        date: editingDraft.date,
        time: editingDraft.time,
        notes: editingDraft.notes.trim(),
      });
      cancelEdit();
      await refresh();
    } catch (e) {
      setError(`Could not update appointment: ${e.message}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(appointment) {
    if (!confirm(`Delete "${appointment.title}"?`)) return;
    try {
      await deleteAppointment(appointment.id);
      await refresh();
    } catch (e) {
      setError(`Could not delete appointment: ${e.message}`);
    }
  }

  const grouped = useMemo(() => groupByDate(appointments), [appointments]);
  const backendInfo = getBackendInfo();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>📅 Appointments</h1>
          <p className="subtitle">
            Signed in as <strong>{user.displayName}</strong> ({user.username})
          </p>
        </div>
        <button type="button" className="secondary" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <section className="card">
        <h2>New appointment</h2>
        <form onSubmit={handleCreate} className="form">
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Project kickoff"
              required
              maxLength={200}
            />
          </label>
          <label>
            Client / person <span className="muted">(optional)</span>
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="e.g. Acme Corp"
              maxLength={200}
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
            Notes <span className="muted">(optional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Anything to remember about this appointment"
              maxLength={2000}
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add appointment'}
          </button>
        </form>
      </section>

      {error && (
        <div className="error" role="alert">
          {error}{' '}
          <button type="button" className="link" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

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
                      {editing === appt.id ? (
                        <EditRow
                          draft={editingDraft}
                          setDraft={setEditingDraft}
                          onCancel={cancelEdit}
                          onSave={saveEdit}
                          saving={savingEdit}
                        />
                      ) : (
                        <>
                          <div className="appt-time">{appt.time}</div>
                          <div className="appt-body">
                            <div className="appt-title">{appt.title}</div>
                            {appt.clientName && <div className="appt-client">{appt.clientName}</div>}
                            {appt.notes && <div className="appt-notes">{appt.notes}</div>}
                            {appt.createdByName && (
                              <div className="appt-meta">by {appt.createdByName}</div>
                            )}
                          </div>
                          <div className="appt-actions">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => startEdit(appt)}
                              aria-label="Edit"
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="ghost danger"
                              onClick={() => handleDelete(appt)}
                              aria-label="Delete"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </>
                      )}
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
          Backend mode: <code>{backendInfo.mode}</code>
          {backendInfo.url !== '—' && (
            <>
              {' '}— <code>{backendInfo.url}</code>
            </>
          )}
        </small>
      </footer>
    </div>
  );
}

function EditRow({ draft, setDraft, onCancel, onSave, saving }) {
  return (
    <div className="edit-row">
      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Title"
        maxLength={200}
      />
      <input
        type="text"
        value={draft.clientName}
        onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
        placeholder="Client / person"
        maxLength={200}
      />
      <div className="row">
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
        />
        <input
          type="time"
          value={draft.time}
          onChange={(e) => setDraft({ ...draft, time: e.target.value })}
        />
      </div>
      <textarea
        value={draft.notes}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        rows={2}
        placeholder="Notes"
        maxLength={2000}
      />
      <div className="edit-actions">
        <button type="button" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
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
