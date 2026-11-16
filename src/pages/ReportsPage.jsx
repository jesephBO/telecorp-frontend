import PageTitle from '../components/common/PageTitle.jsx';
import ReportList from '../components/reports/ReportList.jsx';


export default function ReportsPage({ allReports, openDetail, setReportOpen, staff, updateStatus }) {
  return <><PageTitle eyebrow={staff ? 'MESA DE SERVICIO' : 'TU HISTORIAL'} title={staff ? 'Incidencias' : 'Tus reportes'} subtitle={staff ? 'Revisa los reportes y gestiona su estado.' : 'Cada reporte conserva su historial de evolución.'} action={<button className="primary-button compact" onClick={() => setReportOpen(true)}>＋ Nuevo reporte</button>}/><section className="panel full-panel"><ReportList reports={allReports} onOpen={openDetail} staff={staff} onStatus={updateStatus}/></section></>;
}
