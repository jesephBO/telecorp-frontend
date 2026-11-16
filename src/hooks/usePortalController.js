import { NETWORK_ROLES } from '../models/networkModel.js';
import { api } from '../api/client.js';
import { arrayAt, pick } from '../utils/formatters.js';
import { getSession, tokenClaims } from '../services/authService.js';
import { useCallback, useEffect, useMemo, useState } from 'react';


export default function usePortalController() {
  const [session, setSession] = useState(() => getSession());
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState('overview');
  const [zoneFilter, setZoneFilter] = useState('');
  const [staffReportMode, setStaffReportMode] = useState('reports');
  const [reportRefreshKey, setReportRefreshKey] = useState(0);
  const [data, setData] = useState({ reports: [], metrics: null, alerts: [], zones: [], antennas: [], measurements: [], workOrders: [], notifications: [] });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [reportForm, setReportForm] = useState({ numeroServicio: '', zona: '', tipoProblema: 'SIN_INTERNET', descripcion: '', fechaHora: '' });
  const [chatText, setChatText] = useState('');
  const [chatReply, setChatReply] = useState('');
  const claims = useMemo(() => session ? tokenClaims(session) : null, [session]);
  const staff = Boolean(claims?.groups?.some((group) => NETWORK_ROLES.includes(group)));
  const token = session?.IdToken;
  const refresh = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    const jobs = [api('identity', '/auth/perfil', { token }).then((profileValue) => setProfile(profileValue.user || profileValue)), api('notifications', '/v1/notifications?limit=20', { token }).then((result) => setData((old) => ({ ...old, notifications: arrayAt(result, 'notifications', 'items') })))];
    if (staff) jobs.push(api('incidents', '/incidencias/metricas', { token }).then((metrics) => setData((old) => ({ ...old, metrics }))));
    if (staff) jobs.push(api('telemetry', '/v1/telemetry/alerts?limit=8', { token }).then((result) => setData((old) => ({ ...old, alerts: arrayAt(result, 'alerts', 'items') }))));
    if (staff) jobs.push(api('coverage', '/v1/coverage/zones?limit=30', { token }).then((result) => {
      const zones = arrayAt(result, 'features').map((feature) => feature.properties || feature);
      setData((old) => ({ ...old, zones }));
      if (!zoneFilter && zones.length) setZoneFilter(String(pick(zones[0].zoneId, zones[0].zone_id, zones[0].id, '')));
    }));
    if (staff) jobs.push(api('infrastructure', '/antennas', { token }).then(async (result) => {
      const antennas = arrayAt(result, 'antennas');
      setData((old) => ({ ...old, antennas }));
      const latest = await Promise.allSettled(antennas.slice(0, 8).map(async (antenna) => {
        const antennaId = pick(antenna.antenna_id, antenna.antennaId, antenna.id);
        if (!antennaId) return null;
        return api('telemetry', `/v1/telemetry/antennas/${encodeURIComponent(antennaId)}/latest`, { token });
      }));
      setData((old) => ({ ...old, measurements: latest.filter((entry) => entry.status === 'fulfilled' && entry.value).map((entry) => entry.value) }));
    }));
    if (staff) jobs.push(api('field', '/work-orders?limit=6', { token }).then((result) => setData((old) => ({ ...old, workOrders: arrayAt(result?.workOrders, 'items') }))));
    const settled = await Promise.allSettled(jobs);
    const failed = settled.filter((result) => result.status === 'rejected');
    if (failed.length) setToast(`${failed.length} servicio(s) no respondieron. Revisa las URL configuradas.`);
    setBusy(false);
  }, [staff, token]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!token) return;
    const path = staff && zoneFilter ? `/incidencias?zona=${encodeURIComponent(zoneFilter)}${staffReportMode === 'collectives' ? '&tipo=colectivos' : ''}` : '/incidencias';
    api('incidents', path, { token }).then((result) => setData((old) => ({ ...old, reports: arrayAt(result, 'reportes', 'incidentes', 'items') }))).catch((error) => setToast(error.message));
  }, [token, staff, zoneFilter, staffReportMode, reportRefreshKey]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);
  if (!session) return { session };

  const createReport = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const body = { numeroServicio: reportForm.numeroServicio, zona: reportForm.zona, tipoProblema: reportForm.tipoProblema, descripcion: reportForm.descripcion, ...(reportForm.fechaHora ? { fechaHora: new Date(reportForm.fechaHora).toISOString() } : {}) };
      const result = await api('incidents', '/incidencias', { token, method: 'POST', body });
      setToast(`Reporte registrado · ${result.reporteId || 'recibido'}`); setReportOpen(false); setReportForm({ numeroServicio: '', zona: '', tipoProblema: 'SIN_INTERNET', descripcion: '', fechaHora: '' }); setReportRefreshKey((key) => key + 1); await refresh();
    } catch (error) { setToast(error.message); } finally { setBusy(false); }
  };
  const openDetail = async (id) => { try { setDetail(await api('incidents', `/incidencias/${encodeURIComponent(id)}`, { token })); } catch (error) { setToast(error.message); } };
  const updateStatus = async (id, nuevoEstado) => { try { await api('incidents', `/incidencias/${encodeURIComponent(id)}/estado`, { token, method: 'PATCH', body: { nuevoEstado, comentario: 'Actualización desde el centro de operaciones.' } }); setToast('Estado actualizado.'); setReportRefreshKey((key) => key + 1); await refresh(); } catch (error) { setToast(error.message); } };
  const markRead = async (id) => { try { await api('notifications', `/v1/notifications/${encodeURIComponent(id)}/read`, { token, method: 'PATCH' }); await refresh(); } catch (error) { setToast(error.message); } };
  const sendChat = async (event) => { event.preventDefault(); try { const result = await api('incidents', '/soporte/chat', { token, method: 'POST', body: { mensaje: chatText } }); setChatReply(pick(result.respuesta, result.message, result.answer, 'Recibimos tu consulta.')); setChatText(''); } catch (error) { setChatReply(error.message); } };
  const allReports = data.reports;
  const metricTotal = pick(data.metrics?.totalReportes, data.metrics?.totalIncidencias, data.metrics?.total, data.metrics?.resumen?.total, 0);
  const activeCount = allReports.filter((report) => !/solucion|cerrad/i.test(String(pick(report.estado, report.status, '')))).length;
  const goto = (target) => setPage(target);
  
  return { activeCount, allReports, busy, chatReply, chatText, claims, createReport, data, detail, goto, markRead, metricTotal, openDetail, page, profile, refresh, reportForm, reportOpen, sendChat, session, setChatText, setDetail, setReportForm, setReportOpen, setReportRefreshKey, setSession, setStaffReportMode, setToast, setZoneFilter, staff, staffReportMode, toast, token, updateStatus, zoneFilter };
}
