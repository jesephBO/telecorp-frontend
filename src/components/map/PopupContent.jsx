import { STATES } from '../../models/networkModel.js';


export default function PopupContent({ antenna: a, onDetail, zones }) {
  return <div className="antenna-popup"><strong>{a.name || 'Antena de telecomunicaciones'}</strong><code>{a.id}</code><dl>
    <dt>Estado de telemetría</dt><dd style={{ color: STATES[a.state].color }}>{STATES[a.state].label}{a.status ? ` · ${a.status}` : ''}</dd>
    {a.zone && <><dt>Zona</dt><dd>{zones[a.zone]?.name || a.zone}</dd></>}
    <dt>Radio</dt><dd>{a.radius !== null ? `${a.radius.toLocaleString('es-PE')} m` : 'No informado'}</dd>
    {a.stationId && <><dt>Estación</dt><dd>{a.stationName || a.stationId}</dd></>}
  </dl><a href={`#antena=${encodeURIComponent(a.id)}`} onClick={e => { e.preventDefault(); onDetail(a); }}>Ver detalle de la antena ↗</a></div>;
}
