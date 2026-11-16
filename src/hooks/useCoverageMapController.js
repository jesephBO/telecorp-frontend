import { IMPACT_ROLES, boundsFromStations, filterAntennas, normalizeAntenna } from '../models/networkModel.js';
import { api } from '../api/client.js';
import { fetchCoverage, mapConcurrent } from '../services/coverageService.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';


export default function useCoverageMapController({ token, groups, alerts = [], zones = [] }) {
  const [features, setFeatures] = useState([]);
  const [inventory, setInventory] = useState({});
  const [stations, setStations] = useState({});
  const [latest, setLatest] = useState({});
  const [filters, setFilters] = useState({ search: '', state: '', zone: '', station: '' });
  const [circles, setCircles] = useState(true);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [tileErrors, setTileErrors] = useState({});
  const [bounds, setBounds] = useState([-77.20, -12.20, -76.90, -11.90]);
  const [fit, setFit] = useState({ points: [] });
  const [detail, setDetail] = useState(null);
  const [incidentId, setIncidentId] = useState('');
  const [impact, setImpact] = useState(null);
  const [impactError, setImpactError] = useState('');
  const [impactBusy, setImpactBusy] = useState(false);
  const active = useRef(null);
  const impactActive = useRef(null);
  const zoneMap = useMemo(() => Object.fromEntries(zones.map(z => [z.zone_id, z])), [zones]);
  const antennas = useMemo(() => features.map(f => normalizeAntenna(f, inventory, stations, latest)).filter(Boolean), [features, inventory, stations, latest]);
  const visible = useMemo(() => filterAntennas(antennas, filters), [antennas, filters]);
  useEffect(() => {
    impactActive.current?.abort(); setImpact(null); setImpactError(''); setImpactBusy(false);
    return () => impactActive.current?.abort();
  }, [visible]);
  const canImpact = groups.some(g => IMPACT_ROLES.includes(g));
  const openDetail = useCallback(a => setDetail(a), []);
  useEffect(() => {
    if (detail) document.getElementById('antenna-detail')?.focus({ preventScroll: false });
  }, [detail]);
  const load = useCallback(async (area, bootstrap = false) => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    const options = { token, signal: controller.signal };
    setBusy(true); setError(''); setWarnings([]); setImpact(null); setImpactError(''); setDetail(null);
    // Clear the previous area's data so failures never leave it labelled as the new area.
    setFeatures([]); setLatest({});
    try {
      const problems = [];
      if (bootstrap) {
        area = boundsFromStations([]);
        const results = await Promise.allSettled([api('infrastructure', '/antennas', options), api('infrastructure', '/stations', options)]);
        controller.signal.throwIfAborted();
        if (results[0].status === 'fulfilled') setInventory(Object.fromEntries((results[0].value.antennas || []).map(a => [a.antenna_id, a])));
        else problems.push('Inventario no disponible: los nombres y estaciones pueden faltar.');
        if (results[1].status === 'fulfilled') {
          const items = results[1].value.stations || [];
          setStations(Object.fromEntries(items.map(s => [s.stationId, s])));
          area = boundsFromStations(items);
        } else problems.push('Estaciones no disponibles: se consulta inicialmente el área de Lima.');
      }
      setWarnings(problems);
      const data = await fetchCoverage(api, area, options);
      controller.signal.throwIfAborted();
      setFeatures(data);
      const points = data.map(f => normalizeAntenna(f)).filter(Boolean).map(a => [a.latitude, a.longitude]);
      if (points.length) setFit({ points });
      let failures = 0;
      const samples = await mapConcurrent(data, async f => {
        const id = f.properties?.antenna_id || f.id;
        try { return [id, await api('telemetry', `/v1/telemetry/antennas/${encodeURIComponent(id)}/latest`, options)]; }
        catch (err) { if (err.name === 'AbortError') throw err; if (err.status !== 404) failures++; return [id, null]; }
      }, controller.signal);
      controller.signal.throwIfAborted();
      setLatest(Object.fromEntries(samples));
      if (failures) problems.push(`${failures} consultas de telemetría fallaron. Se muestran en gris.`);
      setWarnings(problems);
    } catch (err) { if (!controller.signal.aborted) setError(err instanceof TypeError ? 'No se pudo conectar con la API. Revisa su disponibilidad y que CORS permita el origen actual del frontend.' : err.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [token]);
  useEffect(() => { load(null, true); return () => active.current?.abort(); }, [load]);
  const analyze = async e => {
    e.preventDefault(); setImpactBusy(true); setImpactError(''); setImpact(null);
    const controller = new AbortController(); impactActive.current = controller;
    try {
      const result = await api('coverage', '/v1/coverage/impact-analysis', { token, signal: controller.signal, method: 'POST', body: { incident_id: incidentId.trim(), antenna_ids: visible.map(a => a.id) } });
      setImpact(result);
    } catch (err) { if (!controller.signal.aborted) setImpactError(err.message); } finally { if (!controller.signal.aborted) setImpactBusy(false); }
  };
  
  return { alerts, analyze, antennas, bounds, busy, canImpact, circles, detail, error, filters, fit, impact, impactBusy, impactError, incidentId, load, openDetail, setBounds, setCircles, setDetail, setFilters, setFit, setIncidentId, setTileErrors, stations, tileErrors, token, visible, warnings, zoneMap };
}
