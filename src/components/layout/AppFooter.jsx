import { endpointsConfigured } from '../../api/client.js';


export default function AppFooter({  }) {
  return <footer className="page-footer"><span>TELECORP / CUSTOMER & NETWORK EXPERIENCE</span><span>{endpointsConfigured ? 'SERVICIOS API CONFIGURADOS' : 'CONFIGURA LOS ENDPOINTS PARA ACTIVAR DATOS'}</span></footer>;
}
