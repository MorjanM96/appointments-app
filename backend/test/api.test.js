import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../db.js';
import { createApp } from '../server.js';

let app;
let server;
let baseUrl;
let adminToken;

before(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SEED_ADMIN_PASSWORD = 'test-admin-pass';
  const db = openDatabase(':memory:');
  app = createApp(db);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(() => {
  server?.close();
});

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { status: response.status, body: json };
}

describe('health', () => {
  test('GET /api/health returns ok', async () => {
    const { status, body } = await api('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
  });
});

describe('auth', () => {
  test('login with seeded admin credentials returns a token', async () => {
    const { status, body } = await api('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'test-admin-pass' },
    });
    assert.equal(status, 200);
    assert.ok(body.token);
    assert.equal(body.user.username, 'admin');
    adminToken = body.token;
  });

  test('login with wrong password returns 401', async () => {
    const { status } = await api('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'nope' },
    });
    assert.equal(status, 401);
  });

  test('register creates a new user and returns a token', async () => {
    const { status, body } = await api('/api/auth/register', {
      method: 'POST',
      body: { username: 'alice', password: 'secret123', displayName: 'Alice' },
    });
    assert.equal(status, 201);
    assert.ok(body.token);
    assert.equal(body.user.username, 'alice');
    assert.equal(body.user.displayName, 'Alice');
  });

  test('register rejects duplicate username', async () => {
    const { status, body } = await api('/api/auth/register', {
      method: 'POST',
      body: { username: 'alice', password: 'secret123' },
    });
    assert.equal(status, 409);
    assert.match(body.error, /taken/i);
  });

  test('register rejects weak passwords', async () => {
    const { status } = await api('/api/auth/register', {
      method: 'POST',
      body: { username: 'bob', password: '123' },
    });
    assert.equal(status, 400);
  });

  test('GET /api/auth/me requires a token', async () => {
    const noToken = await api('/api/auth/me');
    assert.equal(noToken.status, 401);

    const withToken = await api('/api/auth/me', { token: adminToken });
    assert.equal(withToken.status, 200);
    assert.equal(withToken.body.user.username, 'admin');
  });
});

describe('appointments', () => {
  test('GET /api/appointments requires auth', async () => {
    const { status } = await api('/api/appointments');
    assert.equal(status, 401);
  });

  test('GET /api/appointments returns seeded data', async () => {
    const { status, body } = await api('/api/appointments', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 5);
    assert.equal(body[0].title, 'Team standup');
  });

  test('POST creates an appointment', async () => {
    const { status, body } = await api('/api/appointments', {
      method: 'POST',
      token: adminToken,
      body: { title: 'Test meeting', clientName: 'Test client', date: '2026-06-01', time: '10:00', notes: 'Notes' },
    });
    assert.equal(status, 201);
    assert.equal(body.title, 'Test meeting');
    assert.equal(body.createdByName, 'Admin');
  });

  test('POST rejects missing fields', async () => {
    const { status } = await api('/api/appointments', {
      method: 'POST',
      token: adminToken,
      body: { title: 'No date' },
    });
    assert.equal(status, 400);
  });

  test('POST rejects bad date format', async () => {
    const { status, body } = await api('/api/appointments', {
      method: 'POST',
      token: adminToken,
      body: { title: 'Bad', date: '01/02/2026', time: '10:00' },
    });
    assert.equal(status, 400);
    assert.match(body.error, /date must be YYYY-MM-DD/);
  });

  test('PATCH updates fields', async () => {
    const create = await api('/api/appointments', {
      method: 'POST',
      token: adminToken,
      body: { title: 'Will be patched', date: '2026-06-02', time: '11:00' },
    });
    const id = create.body.id;
    const { status, body } = await api(`/api/appointments/${id}`, {
      method: 'PATCH',
      token: adminToken,
      body: { title: 'Patched title', notes: 'Now with notes' },
    });
    assert.equal(status, 200);
    assert.equal(body.title, 'Patched title');
    assert.equal(body.notes, 'Now with notes');
    assert.equal(body.date, '2026-06-02');
  });

  test('DELETE removes an appointment', async () => {
    const create = await api('/api/appointments', {
      method: 'POST',
      token: adminToken,
      body: { title: 'Will be deleted', date: '2026-06-03', time: '12:00' },
    });
    const id = create.body.id;
    const del = await api(`/api/appointments/${id}`, { method: 'DELETE', token: adminToken });
    assert.equal(del.status, 200);

    const fetchAgain = await api(`/api/appointments/${id}`, { token: adminToken });
    assert.equal(fetchAgain.status, 404);
  });
});
