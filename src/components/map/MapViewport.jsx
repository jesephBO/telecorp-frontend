import { useEffect } from 'react';
import { useMapEvents } from 'react-leaflet';


export default function Viewport({ onBounds, fit }) {
  const map = useMapEvents({ moveend: () => {
    const b = map.getBounds();
    onBounds([Math.max(-179.999, b.getWest()), Math.max(-89.999, b.getSouth()), Math.min(179.999, b.getEast()), Math.min(89.999, b.getNorth())]);
  } });
  useEffect(() => {
    if (fit.points.length) map.fitBounds(fit.points, { padding: [45, 45], maxZoom: 15, animate: false });
  }, [map, fit]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
