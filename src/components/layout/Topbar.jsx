import { pageLabel } from '../../utils/navigation.js';


export default function Topbar({ busy, claims, goto, page, profile, refresh, setReportRefreshKey }) {
  return <header className="topbar"><div className="breadcrumb"><span>TELECORP</span><b>/</b>{pageLabel(page)}</div><div className="top-actions"><span className="top-clock"><span className="pulse-dot"/>{busy ? 'SINCRONIZANDO' : 'EN VIVO'}</span><button className="icon-button" aria-label="Actualizar" onClick={() => { refresh(); setReportRefreshKey((key) => key + 1); }}>↻</button><button className="top-avatar" onClick={() => goto('notifications')}>{(profile?.email || claims?.email || 'T').slice(0, 1).toUpperCase()}</button></div></header>;
}
