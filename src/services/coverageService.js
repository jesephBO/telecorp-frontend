import { splitBounds } from '../models/networkModel.js';

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
