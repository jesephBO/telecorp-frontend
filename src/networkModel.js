export const NETWORK_ROLES = ['admin', 'supervisor_red', 'operador_soporte', 'tecnico_campo'];
export const IMPACT_ROLES = ['admin', 'supervisor_red', 'operador_soporte'];
export const STATES = {
  operational: { label: 'Operativa', color: '#00d98b' },
  degraded: { label: 'Degradada', color: '#ffab45' },
  failed: { label: 'Falla / deshabilitada', color: '#ff6677' },
  unknown: { label: 'Sin información', color: '#97a3aa' },
};

export function stateOf(status) {
  return ({ NORMAL: 'operational', SATURATED: 'degraded', DOWN: 'failed', DISABLED: 'failed' })[status] || 'unknown';
}

const numeric = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
export function normalizeAntenna(feature, inventory = {}, stations = {}, latest = {}) {
  const p = feature.properties || {};
  const id = p.antenna_id || feature.id;
  const info = inventory[id] || {};
  const station = stations[info.stationId] || {};
  const coordinates = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : [p.longitude, p.latitude];
  if (!id || !coordinates || !numeric(coordinates[0]) || !numeric(coordinates[1])) return null;
  const [longitude, latitude] = coordinates.map(Number);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // Backend put_antenna_coverage validates and stores this field explicitly in metres.
  const radius = numeric(p.coverage_radius_m) && Number(p.coverage_radius_m) > 0 ? Number(p.coverage_radius_m) : null;
  const measurement = latest[id];
  return { id, name: info.name, latitude, longitude, radius, zone: p.zone_id || station.zoneId,
    stationId: info.stationId, stationName: station.name, inventoryStatus: info.status,
    status: measurement?.status, state: stateOf(measurement?.status), measurement, coverage: p };
}

export function filterAntennas(antennas, { search = '', state = '', zone = '', station = '' }) {
  const term = search.trim().toLocaleLowerCase('es');
  return antennas.filter(a => (!state || a.state === state) && (!zone || a.zone === zone)
    && (!station || a.stationId === station) && (!term || [a.id, a.name, a.zone, a.stationId, a.stationName]
      .some(value => String(value || '').toLocaleLowerCase('es').includes(term))));
}

export function boundsFromStations(stations) {
  const points = stations.filter(s => numeric(s.latitude) && numeric(s.longitude) && Math.abs(Number(s.latitude)) <= 90 && Math.abs(Number(s.longitude)) <= 180);
  if (!points.length) return [-77.20, -12.20, -76.90, -11.90];
  return [Math.max(-179.999, Math.min(...points.map(s => Number(s.longitude))) - .05),
    Math.max(-89.999, Math.min(...points.map(s => Number(s.latitude))) - .05),
    Math.min(179.999, Math.max(...points.map(s => Number(s.longitude))) + .05),
    Math.min(89.999, Math.max(...points.map(s => Number(s.latitude))) + .05)];
}

export function splitBounds([west, south, east, north]) {
  if (![west, south, east, north].every(Number.isFinite) || west >= east || south >= north) throw new Error('Área inválida.');
  const columns = Math.ceil(east - west), rows = Math.ceil(north - south);
  if (columns * rows > 64) throw new Error('Acerca el mapa y pulsa «Consultar esta área» para limitar la búsqueda.');
  const boxes = [];
  for (let x = 0; x < columns; x++) for (let y = 0; y < rows; y++) {
    boxes.push([west + x * (east - west) / columns, south + y * (north - south) / rows,
      west + (x + 1) * (east - west) / columns, south + (y + 1) * (north - south) / rows]);
  }
  return boxes;
}

export async function mapConcurrent(items, worker, signal, concurrency = 6) {
  let index = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (index < items.length) {
      signal?.throwIfAborted();
      const current = index++;
      results[current] = await worker(items[current]);
    }
  }));
  return results;
}

export async function fetchCoverage(api, bounds, options) {
  const pages = await mapConcurrent(splitBounds(bounds), async box => {
    const features = [];
    let cursor;
    const seen = new Set();
    do {
      const query = new URLSearchParams({ bbox: box.join(','), limit: '100', ...(cursor ? { cursor } : {}) });
      const result = await api('coverage', `/v1/coverage/antennas?${query}`, options);
      if (result.type !== 'FeatureCollection' || !Array.isArray(result.features)) throw new Error('Respuesta de cobertura inválida.');
      features.push(...result.features);
      cursor = result.cursor;
      if (cursor && seen.has(cursor)) throw new Error('El servicio devolvió un cursor repetido.');
      seen.add(cursor);
    } while (cursor);
    return features;
  }, options.signal, 3);
  return [...new Map(pages.flat().map(f => [f.properties?.antenna_id || f.id, f])).values()];
}
