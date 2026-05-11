import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

let nextId = 6;
let appointments = [
  {
    id: 1,
    title: 'Team standup',
    clientName: 'Engineering team',
    date: '2026-05-12',
    time: '09:30',
    notes: 'Weekly sync',
  },
  {
    id: 2,
    title: 'Dentist',
    clientName: 'Dr. Khalil',
    date: '2026-05-13',
    time: '14:00',
    notes: 'Routine checkup',
  },
  {
    id: 3,
    title: 'Client demo',
    clientName: 'Acme Corp',
    date: '2026-05-14',
    time: '11:00',
    notes: 'Show new dashboard features',
  },
  {
    id: 4,
    title: 'Lunch with Sara',
    clientName: 'Sara Hassan',
    date: '2026-05-15',
    time: '12:30',
    notes: 'Discuss partnership',
  },
  {
    id: 5,
    title: 'Quarterly review',
    clientName: 'Leadership',
    date: '2026-05-18',
    time: '15:00',
    notes: 'Q2 numbers',
  },
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'appointments-api' });
});

app.get('/api/appointments', (req, res) => {
  const sorted = [...appointments].sort((a, b) => {
    const aKey = `${a.date}T${a.time}`;
    const bKey = `${b.date}T${b.time}`;
    return aKey.localeCompare(bKey);
  });
  res.json(sorted);
});

app.get('/api/appointments/:id', (req, res) => {
  const id = Number(req.params.id);
  const appointment = appointments.find((a) => a.id === id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  res.json(appointment);
});

app.post('/api/appointments', (req, res) => {
  const { title, clientName, date, time, notes } = req.body;
  if (!title || !date || !time) {
    return res.status(400).json({ error: 'title, date and time are required' });
  }
  const appointment = {
    id: nextId++,
    title,
    clientName: clientName || '',
    date,
    time,
    notes: notes || '',
  };
  appointments.push(appointment);
  res.status(201).json(appointment);
});

app.delete('/api/appointments/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = appointments.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  const [removed] = appointments.splice(index, 1);
  res.json(removed);
});

app.listen(PORT, () => {
  console.log(`Appointments API listening on http://localhost:${PORT}`);
  console.log(`Allowed frontend origin: ${ALLOWED_ORIGIN}`);
});
