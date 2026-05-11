import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { toCamelAppointment } from '../db.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function validateAppointmentInput(body, { partial = false } = {}) {
  const errors = [];
  const { title, clientName, date, time, notes } = body || {};

  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) errors.push('title is required');
    else if (title.length > 200) errors.push('title is too long (max 200)');
  }
  if (!partial || date !== undefined) {
    if (typeof date !== 'string' || !DATE_RE.test(date)) errors.push('date must be YYYY-MM-DD');
  }
  if (!partial || time !== undefined) {
    if (typeof time !== 'string' || !TIME_RE.test(time)) errors.push('time must be HH:MM');
  }
  if (clientName !== undefined && (typeof clientName !== 'string' || clientName.length > 200)) {
    errors.push('clientName must be a string up to 200 chars');
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) {
    errors.push('notes must be a string up to 2000 chars');
  }
  return errors;
}

const SELECT_WITH_USER = `
  SELECT a.id, a.title, a.client_name, a.date, a.time, a.notes,
         a.created_by_id, u.display_name AS created_by_name, a.created_at
    FROM appointments a
    LEFT JOIN users u ON u.id = a.created_by_id
`;

export function createAppointmentsRouter(db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req, res) => {
    const rows = db.prepare(`${SELECT_WITH_USER} ORDER BY a.date ASC, a.time ASC`).all();
    res.json(rows.map(toCamelAppointment));
  });

  router.get('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const row = db.prepare(`${SELECT_WITH_USER} WHERE a.id = ?`).get(id);
    if (!row) return res.status(404).json({ error: 'Appointment not found' });
    res.json(toCamelAppointment(row));
  });

  router.post('/', (req, res) => {
    const errors = validateAppointmentInput(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const { title, clientName = '', date, time, notes = '' } = req.body;

    const info = db.prepare(
      'INSERT INTO appointments (title, client_name, date, time, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title.trim(), clientName, date, time, notes, req.user.id);

    const row = db.prepare(`${SELECT_WITH_USER} WHERE a.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(toCamelAppointment(row));
  });

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const errors = validateAppointmentInput(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const fields = ['title', 'clientName', 'date', 'time', 'notes'];
    const map = { title: 'title', clientName: 'client_name', date: 'date', time: 'time', notes: 'notes' };
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${map[f]} = ?`);
        values.push(typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f]);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'no fields to update' });
    }
    values.push(id);
    db.prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare(`${SELECT_WITH_USER} WHERE a.id = ?`).get(id);
    res.json(toCamelAppointment(row));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' });
    const row = db.prepare(`${SELECT_WITH_USER} WHERE a.id = ?`).get(id);
    if (!row) return res.status(404).json({ error: 'Appointment not found' });
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    res.json(toCamelAppointment(row));
  });

  return router;
}
