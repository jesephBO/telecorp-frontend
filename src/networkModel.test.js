import test from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK_ROLES, IMPACT_ROLES, stateOf, normalizeAntenna, filterAntennas, splitBounds, boundsFromStations, fetchCoverage, mapConcurrent } from './networkModel.js';

const feature = { type: 'Feature', id: 'ANT-1', geometry: { type: 'Point', coordinates: [-77.04, -12.04] }, properties: { antenna_id: 'ANT-1', coverage_radius_m: '1250', zone_id: 'ZONE-1' } };
test('GeoJSON longitude/latitude order and explicit metre radius, with real inventory keys', () => {
  const a = normalizeAntenna(feature, { 'ANT-1': { name: 'Antena norte', stationId: 'STA-1', status: 'ACTIVE' } }, { 'STA-1': { name: 'Estación norte' } }, { 'ANT-1': { status: 'SATURATED', traffic_gb_min: 140 } });
  assert.deepEqual([a.latitude, a.longitude, a.radius, a.state, a.stationName], [-12.04, -77.04, 1250, 'degraded', 'Estación norte']);
});
test('missing/invalid coordinates and radius never become invented locations or circles', () => {
  assert.equal(normalizeAntenna({ ...feature, geometry: { type: 'Point', coordinates: [null, -12] } }), null);
  assert.equal(normalizeAntenna({ ...feature, geometry: { type: 'Point', coordinates: [-77, 120] } }), null);
  assert.equal(normalizeAntenna({ ...feature, properties: { antenna_id: 'ANT-1', radius: 1000 } }).radius, null);
});
test('inventory ACTIVE does not imply healthy telemetry; all backend states mapped', () => {
  assert.equal(normalizeAntenna(feature, { 'ANT-1': { status: 'ACTIVE' } }).state, 'unknown');
  assert.deepEqual(['NORMAL', 'SATURATED', 'DOWN', 'DISABLED', undefined].map(stateOf), ['operational', 'degraded', 'failed', 'failed', 'unknown']);
});
test('filters intersect search/state/zone/station instead of mixing scopes', () => {
  const a = { id: 'ANT-1', name: 'Antena norte', state: 'failed', stationId: 'STA-1', zone: 'ZONE-1' };
  assert.equal(filterAntennas([a], { search: 'NORTE', state: 'failed', zone: 'ZONE-1', station: 'STA-1' }).length, 1);
  assert.equal(filterAntennas([a], { station: 'STA-2' }).length, 0);
});
test('bbox partitions respect backend spatial cell limits, reject global queries', () => {
  for (const b of splitBounds([-78.3, -13.1, -75.8, -10.8])) {
    const count = (Math.floor((b[2] + 180) / .1) - Math.floor((b[0] + 180) / .1) + 1) * (Math.floor((b[3] + 90) / .1) - Math.floor((b[1] + 90) / .1) + 1);
    assert.ok(count <= 256);
  }
  assert.throws(() => splitBounds([-179, -80, 179, 80]), /Acerca/);
  assert.deepEqual(boundsFromStations([]), [-77.20, -12.20, -76.90, -11.90]);
});
test('coverage follows opaque cursor, preserves bbox and deduplicates boundary features', async () => {
  const calls = [];
  const request = async (service, path, options) => {
    calls.push({ service, query: new URL('https://test' + path).searchParams, options });
    return { type: 'FeatureCollection', features: [feature], cursor: calls.length === 1 ? 'a+/=' : null };
  };
  const rows = await fetchCoverage(request, [-77.2, -12.2, -76.9, -11.9], { token: 'test-only' });
  assert.equal(rows.length, 1); assert.equal(calls.length, 2);
  assert.equal(calls[1].query.get('cursor'), 'a+/=');
  assert.equal(calls[0].query.get('bbox'), calls[1].query.get('bbox'));
  assert.equal(calls[1].options.token, 'test-only');
});
test('repeated cursors fail instead of looping indefinitely', async () => {
  await assert.rejects(fetchCoverage(async () => ({ type: 'FeatureCollection', features: [], cursor: 'repeat' }), [-77.2, -12.2, -76.9, -11.9], {}), /repetido/);
});
test('telemetry concurrency is bounded and preserves association/order', async () => {
  let running = 0, peak = 0;
  const result = await mapConcurrent(Array.from({ length: 20 }, (_, i) => i), async i => {
    running++; peak = Math.max(peak, running); await new Promise(resolve => setTimeout(resolve, 1)); running--; return i * 2;
  }, undefined, 3);
  assert.ok(peak <= 3); assert.equal(result[19], 38);
});
test('map roles and impact roles match backend, without substring role matches', () => {
  assert.ok(NETWORK_ROLES.includes('tecnico_campo')); assert.ok(!IMPACT_ROLES.includes('tecnico_campo'));
  assert.ok(!NETWORK_ROLES.includes('clientes')); assert.ok(!NETWORK_ROLES.includes('not_admin'));
});
