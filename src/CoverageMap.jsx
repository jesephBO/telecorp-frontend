import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { api } from './api';
import { STATES, IMPACT_ROLES, boundsFromStations, fetchCoverage, filterAntennas, mapConcurrent, normalizeAntenna } from './networkModel';
import './coverage-map.css';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const LAYERS = [
  ['World_Imagery', 'Imágenes', 'Tiles © Esri — Sources: Esri, Vantor, Earthstar Geographics, and the GIS User Community'],
  ['Reference/World_Transportation', 'Calles y carreteras', 'Transportation © Esri, HERE, Garmin, (c) OpenStreetMap contributors'],
  ['Reference/World_Boundaries_and_Places', 'Nombres de lugares', 'Labels © Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community'],
];
const icons = Object.fromEntries(Object.entries(STATES).map(([key, value]) => [key, L.divIcon({
  className: 'antenna-map-icon', html: `<span style="--antenna-color:${value.color}">⌁</span>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
})]));
const date = value => value ? new Date(value).toLocaleString('es-PE') : 'Sin medición';

function Viewport({ onBounds, fit }) {
  const map = useMapEvents({ moveend: () => {
    const b = map.getBounds();
    onBounds([Math.max(-179.999, b.getWest()), Math.max(-89.999, b.getSouth()), Math.min(179.999, b.getEast()), Math.min(89.999, b.getNorth())]);
  } });
  useEffect(() => {
    if (fit.points.length) map.fitBounds(fit.points, { padding: [45, 45], maxZoom: 15, animate: false });
  }, [map, fit]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function PopupContent({ antenna: a, onDetail, zones }) {
  return <div className="antenna-popup"><strong>{a.name || 'Antena de telecomunicaciones'}</strong><code>{a.id}</code><dl>
    <dt>Estado de telemetría</dt><dd style={{ color: STATES[a.state].color }}>{STATES[a.state].label}{a.status ? ` · ${a.status}` : ''}</dd>
    {a.zone && <><dt>Zona</dt><dd>{zones[a.zone]?.name || a.zone}</dd></>}
    <dt>Radio</dt><dd>{a.radius !== null ? `${a.radius.toLocaleString('es-PE')} m` : 'No informado'}</dd>
    {a.stationId && <><dt>Estación</dt><dd>{a.stationName || a.stationId}</dd></>}
  </dl><a href={`#antena=${encodeURIComponent(a.id)}`} onClick={e => { e.preventDefault(); onDetail(a); }}>Ver detalle de la antena ↗</a></div>;
}

// Large inventories use Leaflet clustering without mounting hundreds of React popups.
function ClusteredMarkers({ antennas, onDetail }) {
  const map = useMap();
  useEffect(() => {
    const cluster = L.markerClusterGroup({ chunkedLoading: true, removeOutsideVisibleBounds: true, maxClusterRadius: 55 });
    cluster.addLayers(antennas.map(a => {
      const marker = L.marker([a.latitude, a.longitude], { icon: icons[a.state], title: a.name || a.id });
      const node = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = a.name || a.id;
      const text = document.createElement('p'); text.textContent = `${a.id} · ${STATES[a.state].label} · ${a.radius ?? '—'} m · ${a.zone || 'Sin zona'} · ${a.stationName || a.stationId || 'Sin estación'}`;
      const link = document.createElement('a'); link.href = `#antena=${encodeURIComponent(a.id)}`; link.textContent = 'Ver detalle de la antena ↗';
      link.onclick = e => { e.preventDefault(); onDetail(a); };
      node.append(title, text, link); marker.bindPopup(node);
      return marker;
    }));
    map.addLayer(cluster);
    return () => { cluster.clearLayers(); map.removeLayer(cluster); };
  }, [map, antennas, onDetail]);
  return null;
}

const AntennaLayers = memo(function AntennaLayers({ antennas, circles, onDetail, zones }) {
  return <>{antennas.length > 200 ? <ClusteredMarkers antennas={antennas} onDetail={onDetail}/> : antennas.map(a =>
    <Marker key={a.id} position={[a.latitude, a.longitude]} icon={icons[a.state]} title={a.name || a.id}>
      <Popup><PopupContent antenna={a} onDetail={onDetail} zones={zones}/></Popup>
    </Marker>)}{circles && antennas.filter(a => a.radius !== null).map(a => <Circle key={`radius-${a.id}`} center={[a.latitude, a.longitude]} radius={a.radius}
      pathOptions={{ color: STATES[a.state].color, fillColor: STATES[a.state].color, fillOpacity: .12, weight: 1.5 }}
      eventHandlers={{ click: () => onDetail(a) }}/>)}</>;
});

function Analyst({ antennas, alerts, impact, token }) {
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  useEffect(() => {
    active.current?.abort(); setReply(''); setError(''); setBusy(false);
    return () => active.current?.abort();
  }, [antennas, alerts, impact, token]);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError(''); setReply('');
    const controller = new AbortController(); active.current = controller;
    const evidence = { area_consultada: true, antenas_visibles: antennas.length,
      estados: Object.fromEntries(Object.keys(STATES).map(state => [state, antennas.filter(a => a.state === state).length])),
      muestra: antennas.slice(0, 5).map(a => ({ id: a.id, zona: a.zone, estado: a.status || 'SIN_INFORMACION' })),
      alertas_cargadas: alerts.length,
      ...(impact ? { impacto: { zonas: impact.affected_zones?.map(z => z.zone_id), area_km2: impact.estimated_affected_area_km2 } } : {}) };
    const mensaje = `Usa exclusivamente esta instantánea real del área consultada. No representa toda la red. No inventes causas, predicciones ni diagnósticos; explica límites y datos faltantes.\n${JSON.stringify(evidence)}\nConsulta: ${question}`;
    if (mensaje.length > 2000) { setError('Reduce la consulta o filtra menos antenas para enviar el contexto al asistente.'); setBusy(false); return; }
    try {
      const result = await api('incidents', '/soporte/chat', { token, signal: controller.signal, method: 'POST', body: { mensaje } });
      if (typeof result.respuesta !== 'string') throw new Error('El asistente no devolvió una respuesta válida.');
      setReply(result.respuesta);
    } catch (err) { if (!controller.signal.aborted) setError(err.message); } finally { if (!controller.signal.aborted) setBusy(false); }
  };
  return <section className="panel network-analyst"><span className="eyebrow">ASISTENCIA CON CONTEXTO REAL</span><h3>Analista de Red (IA)</h3>
    <p>Consulta al asistente de soporte sobre las antenas filtradas y las alertas cargadas. El backend ofrece orientación conversacional; sus respuestas requieren revisión y no son diagnósticos verificados.</p>
    <form className="chat-form" onSubmit={submit}><input aria-label="Consulta al analista de red" maxLength={400} required value={question} onChange={e => setQuestion(e.target.value)} placeholder="¿Qué información falta para revisar estas fallas?"/><button className="primary-button compact" disabled={busy || !antennas.length}>{busy ? 'Consultando…' : 'Consultar ↗'}</button></form>
    {error && <p className="notice error" role="alert">{error}</p>}{reply && <div className="chat-reply" aria-live="polite">{reply}</div>}
  </section>;
}

export default function CoverageMap({ token, groups, alerts = [], zones = [] }) {
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
  return <div className="coverage-workspace">
    <section className="panel satellite-panel"><div className="panel-head"><div><h3>Mapa satelital de la red</h3><p>Antenas con cobertura registrada · área consultada</p></div><button className="text-action" disabled={busy} onClick={() => load(bounds)}>↻ Consultar esta área</button></div>
      <div className="map-filters"><label>Buscar<input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="ID, nombre, zona o estación"/></label>
        <label>Estado<select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })}><option value="">Todos los estados</option>{Object.entries(STATES).map(([key, state]) => <option key={key} value={key}>{state.label}</option>)}</select></label>
        <label>Zona<select value={filters.zone} onChange={e => setFilters({ ...filters, zone: e.target.value })}><option value="">Todas las zonas</option>{[...new Set(antennas.map(a => a.zone).filter(Boolean))].sort().map(id => <option key={id} value={id}>{zoneMap[id]?.name || id}</option>)}</select></label>
        <label>Estación<select value={filters.station} onChange={e => setFilters({ ...filters, station: e.target.value })}><option value="">Todas las estaciones</option>{[...new Set(antennas.map(a => a.stationId).filter(Boolean))].sort().map(id => <option key={id} value={id}>{stations[id]?.name || id}</option>)}</select></label>
        <label className="coverage-toggle"><input type="checkbox" checked={circles} onChange={e => setCircles(e.target.checked)}/>Cobertura</label>
        <button className="text-action" disabled={!visible.length} onClick={() => setFit({ points: visible.map(a => [a.latitude, a.longitude]) })}>Encuadrar antenas</button>
      </div>
      <div className="map-legend">{Object.entries(STATES).map(([key, s]) => <span key={key}><i style={{ background: s.color }}/>{s.label}</span>)}<b>{visible.length} / {antennas.length} antenas</b></div>
      <div className="satellite-map-wrap"><MapContainer center={[-12.0464, -77.0428]} zoom={13} preferCanvas className="satellite-map" minZoom={3} maxZoom={19} worldCopyJump={false} maxBounds={[[-85, -180], [85, 180]]}>
        {LAYERS.map(([service, name, attribution], i) => <TileLayer key={service} url={`${ESRI}${service}/MapServer/tile/{z}/{y}/{x}`} attribution={attribution} zIndex={i + 1} maxNativeZoom={19}
          eventHandlers={{ tileerror: () => setTileErrors(old => old[name] ? old : { ...old, [name]: true }) }}/>) }
        <Viewport onBounds={setBounds} fit={fit}/><AntennaLayers antennas={visible} circles={circles} onDetail={openDetail} zones={zoneMap}/>
      </MapContainer>{busy && <div className="map-loading" role="status">Consultando cobertura y telemetría…</div>}</div>
      <div className="map-notes" aria-live="polite">{error && <p className="notice error" role="alert">{error}</p>}{warnings.map(w => <p key={w}>{w}</p>)}
        {Object.keys(tileErrors).length > 0 && <p className="notice error">No se pudieron cargar algunas teselas de Esri: {Object.keys(tileErrors).join(', ')}. Comprueba la conexión y la disponibilidad del proveedor.</p>}
        {!busy && !error && !visible.length && <p>No hay antenas con cobertura registrada que coincidan en esta área. Desplaza el mapa y consulta otra área o revisa los filtros.</p>}
        <p>El radio representa el modelo de cobertura estimada del backend. Los colores provienen de la última medición disponible; sin medición se muestra gris. No es un mapa de intensidad de señal en tiempo real.</p>
        <a href="https://goto.arcgis.com/termsofuse/viewsummary" target="_blank" rel="noreferrer">Condiciones de uso de Esri</a>
      </div>
    </section>
    {detail && <section className="panel antenna-detail" id="antenna-detail" tabIndex={-1}><div className="panel-head"><div><h3>{detail.name || detail.id}</h3><p>Detalle de antena · {detail.id}</p></div><button className="text-action" onClick={() => setDetail(null)}>Cerrar ×</button></div><div className="detail-facts">
      {Object.entries({ 'Estado de telemetría': detail.status || 'Sin información', 'Última medición': date(detail.measurement?.timestamp), 'Tráfico (GB/min)': detail.measurement?.traffic_gb_min ?? 'No informado', 'Zona': zoneMap[detail.zone]?.name || detail.zone || 'No informada', 'Estación': detail.stationName || detail.stationId || 'No informada', 'Radio (m)': detail.radius ?? 'No informado', 'Latitud': detail.latitude, 'Longitud': detail.longitude, 'Estado de inventario': detail.inventoryStatus || 'No informado', 'Modelo': detail.coverage.coverage_model || 'No informado' }).map(([label, value]) => <span key={label}>{label}<b>{value}</b></span>)}
    </div></section>}
    {canImpact && <section className="panel impact-panel"><h3>Análisis de impacto geográfico</h3><p>Calcula la intersección de cobertura de las antenas filtradas con zonas reales. La operación guarda un artefacto de análisis en el backend.</p>
      <form className="chat-form" onSubmit={analyze}><input aria-label="Identificador de incidencia para analizar" required pattern="[A-Za-z0-9][A-Za-z0-9_.:\-]{0,127}" value={incidentId} onChange={e => setIncidentId(e.target.value)} placeholder="ID de la incidencia asociada"/><button className="primary-button compact" disabled={busy || impactBusy || visible.length < 1 || visible.length > 30}>{impactBusy ? 'Analizando…' : `Analizar ${visible.length} antenas`}</button></form>
      {visible.length > 30 && <p>Filtra hasta 30 antenas para realizar el análisis.</p>}{impactError && <p className="notice error" role="alert">{impactError}</p>}
      {impact && <div className="impact-result"><p>Área afectada: <b>{Number(impact.estimated_affected_area_km2).toLocaleString('es-PE', { maximumFractionDigits: 3 })} km²</b> · Criticidad: <b>{impact.criticality}</b> · Oracle: <b>{impact.oracle_status}</b></p><ul>{impact.affected_zones?.map(z => <li key={z.zone_id}>{z.name || z.zone_id} · {z.criticality} · {Number(z.affected_area_km2).toFixed(3)} km²</li>)}</ul>{!impact.affected_zones?.length && <p>Sin intersecciones con las zonas registradas.</p>}</div>}
    </section>}
    <Analyst antennas={visible} alerts={alerts} impact={impact} token={token}/>
  </div>;
}
