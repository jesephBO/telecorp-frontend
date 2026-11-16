import EmptyState from '../components/common/EmptyState.jsx';
import PageTitle from '../components/common/PageTitle.jsx';
import PanelHead from '../components/common/PanelHead.jsx';
import { fmt, pick } from '../utils/formatters.js';


export default function NotificationsPage({ data, markRead }) {
  return <><PageTitle eyebrow="CENTRO DE MENSAJES" title="Notificaciones" subtitle="Actualizaciones de tus incidencias y del servicio."/><section className="panel full-panel"><PanelHead title="Tu bandeja" subtitle="GET /v1/notifications"/>{data.notifications.length ? data.notifications.map((item, i) => <div className="notification-row" key={item.notificationId || item.id || i}><span className="notice-icon">◌</span><div><b>{pick(item.title, item.titulo, item.type, 'Actualización de servicio')}</b><p>{pick(item.message, item.mensaje, item.body, item.descripcion, 'Hay una actualización disponible.')}</p><small>{fmt(pick(item.createdAt, item.fecha, item.timestamp))}</small></div>{!(item.read || item.leida) && <button className="text-action" onClick={() => markRead(pick(item.notificationId, item.id))}>Marcar leída</button>}</div>) : <EmptyState title="Todo en calma" text="Cuando haya novedades de tus reportes, las verás aquí."/>}</section></>;
}
