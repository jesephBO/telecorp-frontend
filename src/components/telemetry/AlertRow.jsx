import { fmt, pick } from '../../utils/formatters.js';


export default function AlertRow({ alert, index = 0 }) { return <div className="alert-row"><span className="alert-mark">{alert.status === 'RESOLVED' ? '✓' : '!'}</span><div><b>{pick(alert.title, alert.antennaId, alert.alertType, alert.tipo, 'Alerta de infraestructura')}</b><small>{pick(alert.zone, alert.zona, alert.status, 'Telemetría reportada')} · {fmt(pick(alert.createdAt, alert.timestamp, alert.fecha))}</small></div><span className="alert-severity">{pick(alert.severity, alert.severidad, alert.status, 'ACTIVA')}</span></div>; }
