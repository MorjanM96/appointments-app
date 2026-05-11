import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { openDatabase } from './db.js';
import { createAuthRouter } from './routes/auth.js';
import { createAppointmentsRouter } from './routes/appointments.js';

export function createApp(db) {
  const app = express();
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

  app.use(cors({ origin: ALLOWED_ORIGIN, credentials: false }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'appointments-api' });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/appointments', createAppointmentsRouter(db));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// Only start the server if this file is run directly (not imported by tests).
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
  || process.argv[1]?.endsWith('server.js');

if (isMainModule) {
  const PORT = process.env.PORT || 3001;
  const db = openDatabase();
  const app = createApp(db);
  app.listen(PORT, () => {
    console.log(`Appointments API listening on http://localhost:${PORT}`);
    console.log(`Allowed frontend origin: ${process.env.ALLOWED_ORIGIN || 'http://localhost:5173'}`);
  });
}
