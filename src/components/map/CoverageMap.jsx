import Analyst from './NetworkAnalyst.jsx';
import AntennaLayers from './AntennaLayers.jsx';
import { ESRI, LAYERS } from '../../config/esriLayers.js';
import { MapContainer, TileLayer } from 'react-leaflet';
import { STATES } from '../../models/networkModel.js';
import Viewport from './MapViewport.jsx';
import { date } from '../../utils/formatters.js';
import useCoverageMapController from '../../hooks/useCoverageMapController.js';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import '../../styles/coverage-map.css';

export default function CoverageMap(props) {
 const { alerts, analyze, antennas, bounds, busy, canImpact, circles, detail, error, filters, fit, impact, impactBusy, impactError, incidentId, load, openDetail, setBounds, setCircles, setDetail, setFilters, setFit, setIncidentId, setTileErrors, stations, tileErrors, token, visible, warnings, zoneMap } = useCoverageMapController(props);
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
