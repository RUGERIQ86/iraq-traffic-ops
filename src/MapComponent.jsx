import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from './supabaseClient';
import ChatComponent from './ChatComponent';

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

// Target Icon (White Crosshair - Code Black to appear White)
const targetIcon = L.divIcon({
  className: 'target-marker',
  html: `
    <div style="
      width: 20px; height: 20px; 
      border: 2px solid #000000; 
      border-radius: 50%; 
      background: rgba(0, 0, 0, 0.3);
      box-shadow: 0 0 10px #000000;
      position: relative;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4px; height: 4px; background: #000000;"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
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

// Component to handle map clicks for targeting
const MapClickHandler = ({ isTargetMode, onTargetSet }) => {
  useMapEvents({
    click(e) {
      if (isTargetMode) {
        onTargetSet(e.latlng);
      }
    },
  });
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
  const [squadMembers, setSquadMembers] = useState({}); // { 'UNIT-123': { lat, lng, lastUpdate, route_path, target_lat, target_lng } }
  const [isOnline, setIsOnline] = useState(false);

  // Mission/Target State
  const [isTargetMode, setIsTargetMode] = useState(false);
  const [myTarget, setMyTarget] = useState(null); // { lat, lng }
  const [myRoutePath, setMyRoutePath] = useState(null); // Array of [lat, lng]
  const [candidateRoutes, setCandidateRoutes] = useState([]); // Array of route objects
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showLinkModal, setShowLinkModal] = useState(false); // New state for Link Modal

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

  // Real-time Location Sync Logic (Includes Route)
  useEffect(() => {
    if (!userLocation || !supabase || !myUnitId) return;

    const syncLocation = async () => {
      try {
        const payload = { 
            unit_id: myUnitId, 
            lat: userLocation[0], 
            lng: userLocation[1],
            last_updated: new Date().toISOString()
        };

        // If we have a target/route, sync that too
        if (myTarget) {
            payload.target_lat = myTarget.lat;
            payload.target_lng = myTarget.lng;
            payload.route_path = myRoutePath;
        }

        const { error } = await supabase
          .from('locations')
          .upsert(payload);
        
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
  }, [userLocation, myUnitId, myTarget, myRoutePath]);

  // Subscribe to Squad Updates
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'locations' }, (payload) => {
        const { unit_id, lat, lng, route_path, target_lat, target_lng } = payload.new;
        if (unit_id !== myUnitId) {
            setSquadMembers(prev => ({
                ...prev,
                [unit_id]: { 
                    lat, 
                    lng, 
                    lastUpdate: new Date(),
                    route_path, // Receive route from others
                    target_lat,
                    target_lng
                }
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
    setStatusMsg(`LINKING TO UNIT: ${targetIdInput}...`);
    setTimeout(() => {
        setStatusMsg(`LINK ESTABLISHED: ${targetIdInput}`);
        // Demo fallback
        if (!supabase) {
            const demoLat = userLocation ? userLocation[0] + 0.005 : 33.3200;
            const demoLng = userLocation ? userLocation[1] + 0.005 : 44.3700;
            setSquadMembers(prev => ({
                ...prev,
                [targetIdInput]: { lat: demoLat, lng: demoLng, lastUpdate: new Date() }
            }));
        }
        setShowLinkModal(false); // Close modal after linking
        setTargetIdInput(''); // Clear input
    }, 1500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Handle setting a mission target
  const handleSetMissionTarget = async (latlng) => {
    setIsTargetMode(false);
    setMyTarget(latlng);
    setCandidateRoutes([]); // Clear previous candidates
    setMyRoutePath(null); // Clear current path
    setStatusMsg('CALCULATING TACTICAL ROUTES...');

    if (!userLocation) {
        setStatusMsg('ERR: NO START POS');
        return;
    }

    // Fetch Route from OSRM with alternatives
    try {
        const start = `${userLocation[1]},${userLocation[0]}`; // lng,lat
        const end = `${latlng.lng},${latlng.lat}`;
        // Request alternatives=3 to get multiple options
        const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&alternatives=3`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            // Process routes
            const routes = data.routes.map((route, index) => ({
                id: index,
                coords: route.geometry.coordinates.map(c => [c[1], c[0]]), // Convert to [lat, lng]
                distance: route.distance, // meters
                duration: route.duration, // seconds
                name: index === 0 ? 'ALPHA (FASTEST)' : index === 1 ? 'BRAVO (SHORTEST)' : 'CHARLIE (ALT)',
                type: index === 0 ? 'FAST' : index === 1 ? 'SHORT' : 'ALT'
            }));

            // Sort logic could be added here, but OSRM usually puts fastest first
            setCandidateRoutes(routes);
            setSelectedRouteIndex(0);
            setStatusMsg(routes.length > 1 ? 'ROUTES ACQUIRED. AWAITING SELECTION.' : 'OPTIMAL ROUTE ACQUIRED. NO ALTERNATIVES.');
        } else {
            setStatusMsg('ERR: NO ROUTE FOUND');
            // Fallback to straight line
            setMyRoutePath([userLocation, [latlng.lat, latlng.lng]]);
        }
    } catch (error) {
        console.error("Routing Error:", error);
        setStatusMsg('ERR: ROUTING FAILED');
        setMyRoutePath([userLocation, [latlng.lat, latlng.lng]]);
    }
  };

  const confirmRoute = () => {
      if (candidateRoutes.length > 0) {
          setMyRoutePath(candidateRoutes[selectedRouteIndex].coords);
          setCandidateRoutes([]); // Clear candidates after selection
          setStatusMsg(`ROUTE ${candidateRoutes[selectedRouteIndex].name} ENGAGED`);
      }
  };

  const clearMission = () => {
      setMyTarget(null);
      setMyRoutePath(null);
      setCandidateRoutes([]);
      setStatusMsg('MISSION ABORTED');
  };

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true} 
        className={`leaflet-map ${isTargetMode ? 'crosshair-cursor' : ''}`}
      >
        <TrafficLayer />
        <MapFlyTo position={position} />
        <MapClickHandler isTargetMode={isTargetMode} onTargetSet={handleSetMissionTarget} />

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

        {/* Candidate Routes (Selection Mode) */}
        {candidateRoutes.map((route, index) => (
            <Polyline 
                key={index}
                positions={route.coords}
                pathOptions={{ 
                    color: selectedRouteIndex === index ? '#000000' : '#555555', // Black (White on map) for selected, Gray for others
                    weight: selectedRouteIndex === index ? 6 : 3, 
                    opacity: selectedRouteIndex === index ? 1 : 0.5,
                    dashArray: selectedRouteIndex === index ? null : '5, 10'
                }}
                eventHandlers={{
                    click: () => setSelectedRouteIndex(index)
                }}
            >
                 {selectedRouteIndex === index && (
                    <Tooltip sticky className="mission-tooltip">
                        {route.name} | {(route.distance/1000).toFixed(1)}km | {Math.round(route.duration/60)}min
                    </Tooltip>
                 )}
            </Polyline>
        ))}

        {/* Route Selection Panel */}
        {candidateRoutes.length > 0 && (
            <div className="route-selection-panel">
                <div className="panel-header">
                    {candidateRoutes.length > 1 ? 'SELECT INFILTRATION ROUTE' : 'PRIMARY ROUTE LOCKED'}
                </div>
                {candidateRoutes.map((route, index) => (
                    <div 
                        key={index} 
                        className={`route-option ${selectedRouteIndex === index ? 'selected' : ''}`}
                        onClick={() => setSelectedRouteIndex(index)}
                    >
                        <div className="route-name">{route.name}</div>
                        <div className="route-stats">
                            <span>DIST: {(route.distance/1000).toFixed(1)}km</span>
                            <span>TIME: {Math.round(route.duration/60)}min</span>
                        </div>
                    </div>
                ))}
                {candidateRoutes.length === 1 && (
                    <div style={{color: '#aaa', fontSize: '10px', textAlign: 'center', margin: '10px 0'}}>
                        NO ALTERNATIVE ROUTES AVAILABLE FOR THIS TARGET
                    </div>
                )}
                <div className="panel-actions">
                    <button onClick={confirmRoute} className="confirm-btn">[ EXECUTE ]</button>
                    <button onClick={clearMission} className="cancel-btn">[ ABORT ]</button>
                </div>
            </div>
        )}

        {/* My Mission Route (White - Code Black) */}
        {myRoutePath && (
            <>
                {/* Glow Effect Layer */}
                <Polyline 
                    positions={myRoutePath}
                    pathOptions={{ color: '#000000', weight: 8, opacity: 0.3 }}
                />
                {/* Main Line Layer */}
                <Polyline 
                    positions={myRoutePath}
                    pathOptions={{ color: '#000000', weight: 4, opacity: 1 }}
                >
                     <Tooltip sticky className="mission-tooltip">MISSION PATH</Tooltip>
                </Polyline>
                <Marker position={myRoutePath[myRoutePath.length - 1]} icon={targetIcon}>
                    <Popup>
                        <div className="hacker-popup" style={{borderColor: '#000000'}}>
                            <h3 style={{color: '#000000', borderColor: '#000000'}}>MISSION TARGET</h3>
                        </div>
                    </Popup>
                </Marker>
            </>
        )}

        {/* Squad Markers & Tactical Lines */}
        {Object.entries(squadMembers).map(([id, data]) => {
            const distance = userLocation 
                ? calculateDistance(userLocation[0], userLocation[1], data.lat, data.lng)
                : 0;
            
            return (
                <div key={id}>
                    {/* Tactical Line (Green - Link) */}
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

                    {/* Squad Member's Mission Route (White - Code Black) */}
                    {data.route_path && (
                        <Polyline 
                            positions={data.route_path}
                            pathOptions={{ color: '#000000', weight: 3, opacity: 0.8, dashArray: '5, 5' }}
                        >
                             <Tooltip sticky className="mission-tooltip">{id}'s MISSION</Tooltip>
                        </Polyline>
                    )}
                    {/* Squad Member's Target Marker */}
                    {data.target_lat && (
                         <Marker position={[data.target_lat, data.target_lng]} icon={targetIcon} />
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

        {/* Default Baghdad Marker */}
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
      
      {/* Link Unit Modal */}
      {showLinkModal && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h3>ESTABLISH LINK</h3>
                  <input 
                      type="text" 
                      value={targetIdInput}
                      onChange={(e) => setTargetIdInput(e.target.value)}
                      placeholder="ENTER UNIT ID"
                      className="modal-input"
                  />
                  <div className="modal-actions">
                      <button onClick={handleAddTarget} className="confirm-btn">CONNECT</button>
                      <button onClick={() => setShowLinkModal(false)} className="cancel-btn">CANCEL</button>
                  </div>
              </div>
          </div>
      )}

      {/* HUD Interface */}
      <div className="hud-overlay">
          <div className="top-left">
              <div>SYS.OP: {isOnline ? 'ONLINE' : 'OFFLINE'}</div>
              <div>ID: <span style={{color: '#00ff00'}}>{myUnitId}</span></div>
          </div>

          <div className="top-right">
              <div>SQUAD: {Object.keys(squadMembers).length}</div>
              <button onClick={handleLogout} className="logout-btn">[ EXIT ]</button>
          </div>
          
          {/* Bottom Toolbar (Mobile Friendly) */}
          <div className="bottom-toolbar">
              <button 
                  className={`toolbar-btn ${isTargetMode ? 'active' : ''}`}
                  onClick={() => setIsTargetMode(!isTargetMode)}
              >
                  {isTargetMode ? 'CANCEL TARGET' : 'SET TARGET'}
              </button>

              <button 
                  className="toolbar-btn"
                  onClick={() => setShowLinkModal(true)}
              >
                  LINK UNIT
              </button>

              <button 
                  className="toolbar-btn"
                  onClick={handleLocateMe}
              >
                  LOCATE ME
              </button>

              {myTarget && (
                  <button 
                      className="toolbar-btn danger"
                      onClick={clearMission}
                  >
                      ABORT
                  </button>
              )}
          </div>

          <div className="status-bar">
              STATUS: {statusMsg}
          </div>
          
          {/* Center Crosshair (Hidden in Target Mode) */}
          {!isTargetMode && <div className="crosshair"></div>}

          {/* Chat Component */}
          {myUnitId && <ChatComponent myUnitId={myUnitId} />}
      </div>
    </div>
  );
};

export default MapComponent;
