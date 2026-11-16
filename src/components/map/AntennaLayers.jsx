import { Circle, Marker, Popup } from 'react-leaflet';
import ClusteredMarkers from './ClusteredMarkers.jsx';
import PopupContent from './PopupContent.jsx';
import { STATES } from '../../models/networkModel.js';
import { icons } from './antennaIcons.js';
import { memo } from 'react';


const AntennaLayers = memo(function AntennaLayers({ antennas, circles, onDetail, zones }) {
  return <>{antennas.length > 200 ? <ClusteredMarkers antennas={antennas} onDetail={onDetail}/> : antennas.map(a =>
    <Marker key={a.id} position={[a.latitude, a.longitude]} icon={icons[a.state]} title={a.name || a.id}>
      <Popup><PopupContent antenna={a} onDetail={onDetail} zones={zones}/></Popup>
    </Marker>)}{circles && antennas.filter(a => a.radius !== null).map(a => <Circle key={`radius-${a.id}`} center={[a.latitude, a.longitude]} radius={a.radius}
      pathOptions={{ color: STATES[a.state].color, fillColor: STATES[a.state].color, fillOpacity: .12, weight: 1.5 }}
      eventHandlers={{ click: () => onDetail(a) }}/>)}</>;
});
export default AntennaLayers;
