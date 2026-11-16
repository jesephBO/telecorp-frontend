import { BASES } from '../config/endpoints';
export const endpointsConfigured = Object.values(BASES).some(Boolean);

export async function api(service, path, { token, method = 'GET', body, headers = {}, signal } = {}) {
  const base = BASES[service];
  if (!base) throw new Error(`Falta configurar VITE_${service.toUpperCase()}_BASE_URL.`);
  const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: token } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `El servicio respondió ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function appendCursor(path, cursor) {
  if (!cursor) return path;
  return `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}`;
}

export function getBase(service) {
  return BASES[service] || '';
}
