import { Suspense, lazy } from 'react';


const CoverageMap = lazy(() => import('./CoverageMap.jsx'));
export default function NetworkMap(props) { return <Suspense fallback={<div className="panel map-notes" role="status">Cargando mapa satelital…</div>}><CoverageMap {...props}/></Suspense>; }
