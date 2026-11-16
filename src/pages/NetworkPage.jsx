import AlertRow from '../components/telemetry/AlertRow.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import NetworkMap from '../components/map/NetworkMap.jsx';
import PageTitle from '../components/common/PageTitle.jsx';
import PanelHead from '../components/common/PanelHead.jsx';
import Stat from '../components/common/Stat.jsx';
import { fmt, pick } from '../utils/formatters.js';
import { telemetryClass } from '../utils/status.js';


export default function NetworkPage({ claims, data, metricTotal, token }) {
  return <><PageTitle eyebrow="OBSERVABILIDAD" title="Estado de red" subtitle="Zonas, cobertura y telemetría de los endpoints conectados."/><div className="stat-grid"><Stat label="ZONAS" value={data.zones.length} note="Features recibidas" icon="◉"/><Stat label="ALERTAS" value={data.alerts.length} note="Telemetría actual" icon="⌖" accent="rose"/><Stat label="REPORTES" value={metricTotal} note="Métricas de incidencias" icon="▤"/><Stat label="ANTENAS" value={data.antennas.length} note="Inventario de infraestructura" icon="⌁"/></div><NetworkMap token={token} groups={claims?.groups || []} alerts={data.alerts} zones={data.zones}/><div className="dashboard-grid network-lower"><section className="panel"><PanelHead title="Alertas recientes" subtitle="GET /v1/telemetry/alerts"/>{data.alerts.length ? data.alerts.map((alert, i) => <AlertRow key={alert.alertId || i} alert={alert}/>) : <EmptyState title="Sin alertas disponibles" text="Conecta el microservicio de telemetría."/>}</section><section className="panel"><PanelHead title="Mediciones de antenas" subtitle="GET /v1/telemetry/antennas/{id}/latest · muestra de hasta 8 antenas"/>{data.measurements.length ? data.measurements.map((sample, i) => <div className="antenna-measure" key={sample.antenna_id || i}><span className={`measure-state ${telemetryClass(sample.status)}`}/><div><b>{sample.antenna_id}</b><small>{fmt(sample.timestamp)}</small></div><strong>{pick(sample.traffic_gb_min, '—')} <small>GB/min</small></strong><span className="status-pill">{pick(sample.status, 'SIN ESTADO')}</span></div>) : <EmptyState title="Sin mediciones recientes" text="Se consultan hasta 8 antenas del inventario; cada una debe tener una medición recibida."/>}</section></div></>;
}
