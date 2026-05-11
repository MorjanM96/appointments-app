import { demoStorage } from './storage.js';

const API_URL = (import.meta.env.VITE_API_URL || '').trim();
export const isDemoMode = !API_URL;

const TOKEN_KEY = 'auth.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const message = (data && typeof data === 'object' && data.error) || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

// ---------- Auth ----------

export async function login(username, password) {
  if (isDemoMode) {
    const session = demoStorage.login(username, password);
    setToken(session.token);
    return session.user;
  }
  const data = await request('/api/auth/login', { method: 'POST', body: { username, password } });
  setToken(data.token);
  return data.user;
}

export async function register(username, password, displayName) {
  if (isDemoMode) {
    const session = demoStorage.register(username, password, displayName);
    setToken(session.token);
    return session.user;
  }
  const data = await request('/api/auth/register', { method: 'POST', body: { username, password, displayName } });
  setToken(data.token);
  return data.user;
}

export async function fetchCurrentUser() {
  if (isDemoMode) {
    const session = demoStorage.currentSession();
    return session?.user || null;
  }
  if (!getToken()) return null;
  try {
    const data = await request('/api/auth/me');
    return data.user;
  } catch {
    setToken(null);
    return null;
  }
}

export function logout() {
  if (isDemoMode) demoStorage.logout();
  setToken(null);
}

// ---------- Appointments ----------

export async function listAppointments() {
  if (isDemoMode) return demoStorage.listAppointments();
  return request('/api/appointments');
}

export async function createAppointment(data) {
  if (isDemoMode) return demoStorage.createAppointment(data);
  return request('/api/appointments', { method: 'POST', body: data });
}

export async function updateAppointment(id, patch) {
  if (isDemoMode) return demoStorage.updateAppointment(id, patch);
  return request(`/api/appointments/${id}`, { method: 'PATCH', body: patch });
}

export async function deleteAppointment(id) {
  if (isDemoMode) return demoStorage.deleteAppointment(id);
  return request(`/api/appointments/${id}`, { method: 'DELETE' });
}

export function getBackendInfo() {
  return { mode: isDemoMode ? 'demo (localStorage)' : 'live API', url: API_URL || '—' };
}
