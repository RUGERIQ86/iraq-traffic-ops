import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from './supabaseClient';

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

// Custom Military Icon (Red Radiation) - User
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

// Custom Squad Icon (Blue/Green Tactical) - Friend
const squadIcon = L.divIcon({
  className: 'squad-marker',
  html: `
    <div class="squad-core" style="background-color: #00ff00; box-shadow: 0 0 10px #00ff00;"></div>
    <div class="squad-ring" style="border-color: #00ff00;"></div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Calculate distance between two points in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c); // Distance in meters
};

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

const MapComponent = ({ session }) => {
  // Default: Baghdad Coordinates
  const [position, setPosition] = useState([33.3152, 44.3661]);
  const [userLocation, setUserLocation] = useState(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [randomCode, setRandomCode] = useState('INIT...');
  const [statusMsg, setStatusMsg] = useState('SYSTEM READY');
  
  // Multi-user State
  const [myUnitId, setMyUnitId] = useState('');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [squadMembers, setSquadMembers] = useState({}); // { 'UNIT-123': { lat, lng, lastUpdate } }
  const [isOnline, setIsOnline] = useState(false);

  // Use Email as Unit ID (or part of it)
  useEffect(() => {
    if (session?.user?.email) {
        // Use the part before @ as the ID for simplicity
        const emailId = session.user.email.split('@')[0].toUpperCase();
        setMyUnitId(emailId);
    }
  }, [session]);

  // Timer for HUD
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

  // Real-time Location Sync Logic
  useEffect(() => {
    if (!userLocation || !supabase || !myUnitId) return;

    const syncLocation = async () => {
      try {
        const { error } = await supabase
          .from('locations')
          .upsert({ 
            unit_id: myUnitId, 
            lat: userLocation[0], 
            lng: userLocation[1],
            last_updated: new Date().toISOString()
          });
        
        if (error) console.error('Sync Error:', error);
        else setIsOnline(true);
      } catch (err) {
        console.error('Sync Exception:', err);
        setIsOnline(false);
      }
    };

    // Sync immediately then every 10 seconds
    syncLocation();
    const interval = setInterval(syncLocation, 10000);
    return () => clearInterval(interval);
  }, [userLocation, myUnitId]);

  // Subscribe to Squad Updates
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'locations' }, (payload) => {
        const { unit_id, lat, lng } = payload.new;
        if (unit_id !== myUnitId) {
            setSquadMembers(prev => ({
                ...prev,
                [unit_id]: { lat, lng, lastUpdate: new Date() }
            }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myUnitId]);

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

  const handleAddTarget = () => {
    if (!targetIdInput) return;
    // In a real app, we would verify the ID exists.
    // For now, we just add it to our "watch list" visually
    setStatusMsg(`LINKING TO UNIT: ${targetIdInput}...`);
    setTimeout(() => {
        setStatusMsg(`LINK ESTABLISHED: ${targetIdInput}`);
        // Simulate finding them for demo purposes if no backend
        if (!supabase) {
            const demoLat = userLocation ? userLocation[0] + 0.005 : 33.3200;
            const demoLng = userLocation ? userLocation[1] + 0.005 : 44.3700;
            setSquadMembers(prev => ({
                ...prev,
                [targetIdInput]: { lat: demoLat, lng: demoLng, lastUpdate: new Date() }
            }));
        }
    }, 1500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
                <h3 style={{color: 'red', borderColor: 'red'}}>MY UNIT: {myUnitId}</h3>
                <p>STATUS: ONLINE</p>
                <p>LAT: {userLocation[0].toFixed(4)}</p>
                <p>LNG: {userLocation[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Squad Markers & Tactical Lines */}
        {Object.entries(squadMembers).map(([id, data]) => {
            const distance = userLocation 
                ? calculateDistance(userLocation[0], userLocation[1], data.lat, data.lng)
                : 0;
            
            return (
                <div key={id}>
                    {/* Tactical Line */}
                    {userLocation && (
                        <Polyline 
                            positions={[userLocation, [data.lat, data.lng]]}
                            pathOptions={{ color: '#00ff00', weight: 3, opacity: 1 }}
                        >
                            <Tooltip permanent direction="center" className="tactical-tooltip">
                                {id} | {distance > 1000 ? (distance/1000).toFixed(1) + 'km' : distance + 'm'}
                            </Tooltip>
                        </Polyline>
                    )}

                    {/* Squad Marker */}
                    <Marker position={[data.lat, data.lng]} icon={squadIcon}>
                        <Popup>
                            <div className="hacker-popup" style={{borderColor: '#00ff00'}}>
                                <h3 style={{color: '#00ff00', borderColor: '#00ff00'}}>UNIT: {id}</h3>
                                <p>STATUS: LINKED</p>
                                <p>DIST: {distance}m</p>
                                <p>LAT: {data.lat.toFixed(4)}</p>
                                <p>LNG: {data.lng.toFixed(4)}</p>
                            </div>
                        </Popup>
                    </Marker>
                </div>
            );
        })}

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
            <div>SYS.OP: {isOnline ? 'CONNECTED' : 'OFFLINE'}</div>
            <div>UNIT_ID: <span style={{color: '#00ff00', fontWeight: 'bold'}}>{myUnitId}</span></div>
        </div>
        <div className="top-right">
            <div>LOC: {userLocation ? 'SECURE' : 'SEARCHING...'}</div>
            <div>SQUAD: {Object.keys(squadMembers).length} UNITS</div>
            <button 
                onClick={handleLogout}
                style={{
                    background: 'transparent',
                    border: '1px solid red',
                    color: 'red',
                    fontSize: '10px',
                    marginTop: '5px',
                    cursor: 'pointer'
                }}
            >
                [ TERMINATE SESSION ]
            </button>
        </div>
        
        {/* Squad Link Panel (Bottom Left) */}
        <div className="bottom-left" style={{pointerEvents: 'auto'}}>
            <div style={{marginBottom: '5px'}}>LINK NEW UNIT:</div>
            <div style={{display: 'flex', gap: '5px'}}>
                <input 
                    type="text" 
                    value={targetIdInput}
                    onChange={(e) => setTargetIdInput(e.target.value)}
                    placeholder="ENTER UNIT ID"
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: '1px solid #00ff00',
                        color: '#00ff00',
                        padding: '5px',
                        fontFamily: 'monospace',
                        width: '120px'
                    }}
                />
                <button 
                    onClick={handleAddTarget}
                    style={{
                        background: '#00ff00',
                        color: 'black',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '5px 10px'
                    }}
                >
                    LINK
                </button>
            </div>
            <div style={{fontSize: '10px', marginTop: '5px', color: '#aaa'}}>
                STATUS: {statusMsg}
            </div>
        </div>

        <div className="bottom-right">
            <div>ENC: AES-256</div>
            <div>SEC_LEVEL: 5</div>
        </div>
        
        {/* Center Crosshair */}
        <div className="crosshair"></div>

        {/* Locate Button */}
        <button className="locate-btn" onClick={handleLocateMe}>
            [ RE-ACQUIRE TARGET ]
        </button>
      </div>
    </div>
  );
};

export default MapComponent;
