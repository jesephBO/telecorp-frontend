import AppFooter from './components/layout/AppFooter.jsx';
import AuthPage from './pages/AuthPage.jsx';
import NetworkPage from './pages/NetworkPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import ReportDetailModal from './components/reports/ReportDetailModal.jsx';
import ReportFormModal from './components/reports/ReportFormModal.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import SupportPage from './pages/SupportPage.jsx';
import Toast from './components/common/Toast.jsx';
import Topbar from './components/layout/Topbar.jsx';
import WorkOrdersPage from './pages/WorkOrdersPage.jsx';
import usePortalController from './hooks/usePortalController.js';


export default function App() {
  const portal = usePortalController();
  if (!portal.session) return <AuthPage/>;
  const { detail, page, reportOpen, staff, toast } = portal;
  return <div className="app-shell"><Sidebar {...portal}/>
    <main className="main-area"><Topbar {...portal}/>
      <section className="page-content">{page === 'overview' && <OverviewPage {...portal}/>}
      {page === 'reports' && <ReportsPage {...portal}/>}
      {page === 'network' && staff && <NetworkPage {...portal}/>}
      {page === 'work' && <WorkOrdersPage {...portal}/>}
      {page === 'notifications' && <NotificationsPage {...portal}/>}
      {page === 'support' && <SupportPage {...portal}/>}
      <AppFooter {...portal}/>
      </section></main>
    {toast && <Toast {...portal}/>}
    {reportOpen && <ReportFormModal {...portal}/>}
    {detail && <ReportDetailModal {...portal}/>}
  </div>;
}
