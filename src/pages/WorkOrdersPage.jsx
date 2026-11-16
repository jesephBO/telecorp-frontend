import EmptyState from '../components/common/EmptyState.jsx';
import PageTitle from '../components/common/PageTitle.jsx';
import PanelHead from '../components/common/PanelHead.jsx';
import { pick } from '../utils/formatters.js';


export default function WorkOrdersPage({ data }) {
  return <><PageTitle eyebrow="OPERACIÓN EN CAMPO" title="Órdenes de trabajo" subtitle="Tareas devueltas por el servicio de operaciones."/><section className="panel full-panel"><PanelHead title="Cola de trabajo" subtitle="GET /work-orders"/>{data.workOrders.length ? data.workOrders.map((order, i) => <div className="work-row large-row" key={order.workOrderId || order.id || i}><span className="work-icon">⌖</span><div><b>{pick(order.title, order.tipo, order.antennaId, order.id, 'Orden de trabajo')}</b><small>{pick(order.zone, order.zona, order.description, 'Sin descripción adicional')}</small></div><span className="status-pill">{pick(order.status, order.estado, 'ABIERTA')}</span></div>) : <EmptyState title="No hay órdenes para mostrar" text="Revisa el endpoint del servicio field y los permisos del grupo Cognito."/>}</section></>;
}
