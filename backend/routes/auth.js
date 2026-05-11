import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, requireAuth } from '../middleware/auth.js';
import { toCamelUser } from '../db.js';

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const PASSWORD_MIN = 6;

export function createAuthRouter(db) {
  const router = Router();

  router.post('/register', (req, res) => {
    const { username, password, displayName } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'username must be 3-32 chars: letters, numbers, _, -, .' });
    }
    if (password.length < PASSWORD_MIN) {
      return res.status(400).json({ error: `password must be at least ${PASSWORD_MIN} characters` });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'username is already taken' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const finalDisplayName = (displayName || username).trim().slice(0, 64) || username;

    const info = db.prepare(
      'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
    ).run(username, finalDisplayName, passwordHash);

    const user = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = signToken({ sub: user.id, username: user.username, displayName: user.display_name });
    res.status(201).json({ user: toCamelUser(user), token });
  });

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const row = db.prepare('SELECT id, username, display_name, password_hash, created_at FROM users WHERE username = ?').get(username);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = signToken({ sub: row.id, username: row.username, displayName: row.display_name });
    res.json({ user: toCamelUser(row), token });
  });

  router.get('/me', requireAuth, (req, res) => {
    const row = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ user: toCamelUser(row) });
  });

  return router;
}
