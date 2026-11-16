import L from 'leaflet';
import { STATES } from '../../models/networkModel.js';
import { icons } from './antennaIcons.js';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet.markercluster';

export default function ClusteredMarkers({ antennas, onDetail }) {
  const map = useMap();
  useEffect(() => {
    const cluster = L.markerClusterGroup({ chunkedLoading: true, removeOutsideVisibleBounds: true, maxClusterRadius: 55 });
    cluster.addLayers(antennas.map(a => {
      const marker = L.marker([a.latitude, a.longitude], { icon: icons[a.state], title: a.name || a.id });
      const node = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = a.name || a.id;
      const text = document.createElement('p'); text.textContent = `${a.id} · ${STATES[a.state].label} · ${a.radius ?? '—'} m · ${a.zone || 'Sin zona'} · ${a.stationName || a.stationId || 'Sin estación'}`;
      const link = document.createElement('a'); link.href = `#antena=${encodeURIComponent(a.id)}`; link.textContent = 'Ver detalle de la antena ↗';
      link.onclick = e => { e.preventDefault(); onDetail(a); };
      node.append(title, text, link); marker.bindPopup(node);
      return marker;
    }));
    map.addLayer(cluster);
    return () => { cluster.clearLayers(); map.removeLayer(cluster); };
  }, [map, antennas, onDetail]);
  return null;
}
