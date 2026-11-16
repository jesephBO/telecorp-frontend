import L from 'leaflet';
import { STATES } from '../../models/networkModel.js';


export const icons = Object.fromEntries(Object.entries(STATES).map(([key, value]) => [key, L.divIcon({
  className: 'antenna-map-icon', html: `<span style="--antenna-color:${value.color}">⌁</span>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
})]));
