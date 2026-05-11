import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const store = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createSupabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : createMemoryStore();

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'appointments-api', store: store.kind });
});

app.get('/api/appointments', async (req, res, next) => {
  try {
    res.json(await store.list());
  } catch (e) { next(e); }
});

app.get('/api/appointments/:id', async (req, res, next) => {
  try {
    const appointment = await store.get(Number(req.params.id));
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (e) { next(e); }
});

app.post('/api/appointments', async (req, res, next) => {
  try {
    const { title, clientName, date, time, notes } = req.body;
    if (!title || !date || !time) {
      return res.status(400).json({ error: 'title, date and time are required' });
    }
    const created = await store.create({ title, clientName, date, time, notes });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

app.delete('/api/appointments/:id', async (req, res, next) => {
  try {
    const removed = await store.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Appointment not found' });
    res.json(removed);
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Appointments API listening on http://localhost:${PORT}`);
  console.log(`Allowed frontend origin: ${ALLOWED_ORIGIN}`);
  console.log(`Storage backend: ${store.kind}`);
});

// ---------- storage backends ----------

function createSupabaseStore(url, key) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const TABLE = 'appointments';

  return {
    kind: 'supabase',
    async list() {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (error) throw error;
      return data.map(toCamel);
    },
    async get(id) {
      const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? toCamel(data) : null;
    },
    async create({ title, clientName, date, time, notes }) {
      const { data, error } = await supabase
        .from(TABLE)
        .insert(toSnake({ title, clientName: clientName || '', date, time, notes: notes || '' }))
        .select()
        .single();
      if (error) throw error;
      return toCamel(data);
    },
    async remove(id) {
      const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select().maybeSingle();
      if (error) throw error;
      return data ? toCamel(data) : null;
    },
  };
}

function createMemoryStore() {
  console.warn('[warn] SUPABASE_URL not set — using in-memory store (data resets on restart).');
  let nextId = 6;
  let rows = [
    { id: 1, title: 'Team standup',     clientName: 'Engineering team', date: '2026-05-12', time: '09:30', notes: 'Weekly sync' },
    { id: 2, title: 'Dentist',          clientName: 'Dr. Khalil',       date: '2026-05-13', time: '14:00', notes: 'Routine checkup' },
    { id: 3, title: 'Client demo',      clientName: 'Acme Corp',        date: '2026-05-14', time: '11:00', notes: 'Show new dashboard features' },
    { id: 4, title: 'Lunch with Sara',  clientName: 'Sara Hassan',      date: '2026-05-15', time: '12:30', notes: 'Discuss partnership' },
    { id: 5, title: 'Quarterly review', clientName: 'Leadership',       date: '2026-05-18', time: '15:00', notes: 'Q2 numbers' },
  ];

  return {
    kind: 'memory',
    async list() {
      return [...rows].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    },
    async get(id) {
      return rows.find((a) => a.id === id) || null;
    },
    async create({ title, clientName, date, time, notes }) {
      const row = { id: nextId++, title, clientName: clientName || '', date, time, notes: notes || '' };
      rows.push(row);
      return row;
    },
    async remove(id) {
      const idx = rows.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      const [removed] = rows.splice(idx, 1);
      return removed;
    },
  };
}

function toCamel(row) {
  return {
    id: row.id,
    title: row.title,
    clientName: row.client_name,
    date: typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().slice(0, 10),
    time: typeof row.time === 'string' ? row.time.slice(0, 5) : row.time,
    notes: row.notes,
  };
}

function toSnake({ title, clientName, date, time, notes }) {
  return { title, client_name: clientName, date, time, notes };
}
