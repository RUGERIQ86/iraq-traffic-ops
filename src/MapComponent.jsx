import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Military Icon (Red Radiation)
const militaryIcon = L.divIcon({
  className: 'military-user-marker',
  html: `
    <div class="radiation-core"></div>
    <div class="radiation-wave"></div>
    <div class="radiation-wave"></div>
    <div class="radiation-wave"></div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Component to handle traffic updates
const TrafficLayer = () => {
  const map = useMap();
  const trafficLayerRef = useRef(null);

  useEffect(() => {
    // Initial Traffic Layer
    const googleTrafficUrl = 'https://mt1.google.com/vt/lyrs=m,traffic&hl=ar&x={x}&y={y}&z={z}';
    
    trafficLayerRef.current = L.tileLayer(googleTrafficUrl, {
      maxZoom: 20,
      attribution: 'Traffic Data by Google'
    }).addTo(map);

    // Auto-refresh every 3 minutes (180000ms)
    const intervalId = setInterval(() => {
      if (trafficLayerRef.current) {
        const timestamp = new Date().getTime();
        const newUrl = `https://mt1.google.com/vt/lyrs=m,traffic&hl=ar&x={x}&y={y}&z={z}&time=${timestamp}`;
        console.log("Refreshing Traffic Layer...", timestamp);
        trafficLayerRef.current.setUrl(newUrl);
      }
    }, 180000);

    return () => {
      clearInterval(intervalId);
      if (trafficLayerRef.current) {
        map.removeLayer(trafficLayerRef.current);
      }
    };
  }, [map]);

  return null;
};

// Component to handle map flying
const MapFlyTo = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, {
        animate: true,
        duration: 2 // seconds
      });
    }
  }, [position, map]);
  return null;
};

const MapComponent = () => {
  // Default: Baghdad Coordinates
  const [position, setPosition] = useState([33.3152, 44.3661]);
  const [userLocation, setUserLocation] = useState(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [randomCode, setRandomCode] = useState('INIT...');
  const [statusMsg, setStatusMsg] = useState('SYSTEM READY');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      setRandomCode(Math.random().toString(36).substring(7).toUpperCase());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Locate on Mount
  useEffect(() => {
    handleLocateMe();
  }, []);

  const handleLocateMe = () => {
    setStatusMsg('ACQUIRING TARGET...');
    if (!navigator.geolocation) {
      setStatusMsg('ERR: GEO_NOT_SUPPORTED');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos = [latitude, longitude];
        setUserLocation(newPos);
        setPosition(newPos); // This triggers flyTo
        setStatusMsg('TARGET LOCKED');
      },
      (err) => {
        console.error(err);
        setStatusMsg('ERR: SIGNAL_LOST');
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="map-wrapper">
      <MapContainer center={position} zoom={13} scrollWheelZoom={true} className="leaflet-map">
        <TrafficLayer />
        <MapFlyTo position={position} />

        {/* User Location Marker (Red Radiation) */}
        {userLocation && (
          <Marker position={userLocation} icon={militaryIcon}>
            <Popup>
              <div className="hacker-popup">
                <h3 style={{color: 'red', borderColor: 'red'}}>YOUR LOCATION</h3>
                <p>STATUS: DETECTED</p>
                <p>LAT: {userLocation[0].toFixed(4)}</p>
                <p>LNG: {userLocation[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Default Baghdad Marker (only if user location not set yet) */}
        {!userLocation && (
            <Marker position={[33.3152, 44.3661]}>
            <Popup>
                <div className="hacker-popup">
                <h3>TARGET: BAGHDAD</h3>
                <p>STATUS: MONITORING</p>
                </div>
            </Popup>
            </Marker>
        )}

      </MapContainer>
      
      {/* Radar Effect Overlay */}
      <div className="radar-container">
        <div className="radar-grid"></div>
        <div className="radar-sweep"></div>
      </div>

      {/* Overlay Effects */}
      <div className="scanline"></div>
      <div className="vignette"></div>
      
      {/* HUD Interface */}
      <div className="hud-overlay">
        <div className="top-left">
            <div>SYS.OP: ONLINE</div>
            <div>T: {time}</div>
        </div>
        <div className="top-right">
            <div>LOC: {userLocation ? 'USER_SECURE' : 'IRAQ_SEC_01'}</div>
            <div>SAT_LINK: ACTIVE</div>
        </div>
        <div className="bottom-left">
            <div>STATUS: {statusMsg}</div>
            <div>PKT: {randomCode}</div>
        </div>
        <div className="bottom-right">
            <div>ENC: AES-256</div>
            <div>SEC_LEVEL: 5</div>
        </div>
        
        {/* Center Crosshair */}
        <div className="crosshair"></div>

        {/* Locate Button */}
        <button className="locate-btn" onClick={handleLocateMe}>
            [ ACQUIRE TARGET ]
        </button>
      </div>
    </div>
  );
};

export default MapComponent;
