const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  listAppointments: () => request('/api/appointments'),
  createAppointment: (data) =>
    request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAppointment: (id) =>
    request(`/api/appointments/${id}`, { method: 'DELETE' }),
  health: () => request('/api/health'),
};
