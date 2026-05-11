import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function openDatabase(dbPath = process.env.DATABASE_PATH || 'data/app.db') {
  const resolvedPath = dbPath === ':memory:'
    ? ':memory:'
    : (isAbsolute(dbPath) ? dbPath : resolve(__dirname, dbPath));

  if (resolvedPath !== ':memory:') {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  seed(db);

  return db;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      display_name  TEXT    NOT NULL,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      client_name   TEXT    NOT NULL DEFAULT '',
      date          TEXT    NOT NULL,
      time          TEXT    NOT NULL,
      notes         TEXT    NOT NULL DEFAULT '',
      created_by_id INTEGER NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date_time
      ON appointments (date, time);
  `);
}

function seed(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;

  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME || 'Admin';
  const passwordHash = bcrypt.hashSync(password, 10);

  const userId = db.prepare(
    'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
  ).run(username, displayName, passwordHash).lastInsertRowid;

  console.log(`[seed] Created admin user: ${username} / ${password} (change in .env)`);

  const samples = [
    ['Team standup',     'Engineering team', '2026-05-12', '09:30', 'Weekly sync'],
    ['Dentist',          'Dr. Khalil',       '2026-05-13', '14:00', 'Routine checkup'],
    ['Client demo',      'Acme Corp',        '2026-05-14', '11:00', 'Show new dashboard features'],
    ['Lunch with Sara',  'Sara Hassan',      '2026-05-15', '12:30', 'Discuss partnership'],
    ['Quarterly review', 'Leadership',       '2026-05-18', '15:00', 'Q2 numbers'],
  ];

  const insert = db.prepare(
    'INSERT INTO appointments (title, client_name, date, time, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row, userId);
  });
  insertMany(samples);
  console.log(`[seed] Inserted ${samples.length} sample appointments`);
}

export function toCamelAppointment(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    clientName: row.client_name,
    date: row.date,
    time: row.time,
    notes: row.notes,
    createdById: row.created_by_id,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
  };
}

export function toCamelUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}
