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

// Custom Icons Generator based on Unit Type
const getUnitIcon = (type, isMe = false) => {
  const color = isMe ? '#ff0000' : '#00ff00';
  let iconHtml = '';

  switch (type) {
    case 'driver':
      iconHtml = `
        <div class="unit-icon driver" style="color: ${color}; font-size: 24px;">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
          <div class="radiation-wave" style="border-color: ${color}"></div>
        </div>`;
      break;
    case 'soldier':
      iconHtml = `
        <div class="unit-icon soldier" style="color: ${color}; font-size: 24px;">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          <div class="radiation-wave" style="border-color: ${color}"></div>
        </div>`;
      break;
    default: // infantry/default radiation
      iconHtml = `
        <div class="military-user-marker">
          <div class="radiation-core" style="background: ${color}"></div>
          <div class="radiation-wave" style="border-color: ${color}"></div>
          <div class="radiation-wave" style="border-color: ${color}"></div>
          <div class="radiation-wave" style="border-color: ${color}"></div>
        </div>`;
  }

  return L.divIcon({
    className: 'custom-unit-marker',
    html: iconHtml,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

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
    // RESTORING STABLE GOOGLE MAPS INFRASTRUCTURE
    // Primary Base Map + Integrated Traffic Layer
    const googleTrafficUrl = 'https://mt{s}.google.com/vt/lyrs=m,traffic&hl=ar&x={x}&y={y}&z={z}';
    
    trafficLayerRef.current = L.tileLayer(googleTrafficUrl, {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: 'Map & Traffic Data by Google'
    }).addTo(map);

    // Reliable refresh every 60 seconds to keep traffic updated without overloading
    const intervalId = setInterval(() => {
      if (trafficLayerRef.current) {
        const timestamp = new Date().getTime();
        const sub = Math.floor(Math.random() * 4);
        const refreshedUrl = `https://mt${sub}.google.com/vt/lyrs=m,traffic&hl=ar&x={x}&y={y}&z={z}&time=${timestamp}`;
        trafficLayerRef.current.setUrl(refreshedUrl);
        console.log("GOOGLE TRAFFIC SYNC: Data Refresh", timestamp);
      }
    }, 60000);

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
  const [unitType, setUnitType] = useState('infantry'); // New state for unit type
  
  // Multi-user State
  const [myUnitId, setMyUnitId] = useState('');
  const [targetIdInput, setTargetIdInput] = useState('');
  const [squadMembers, setSquadMembers] = useState({}); // { 'UNIT-123': { lat, lng, lastUpdate, unit_type, ... } }
  const [isOnline, setIsOnline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Mission/Target State
  const [isTargetMode, setIsTargetMode] = useState(false);
  const [myTarget, setMyTarget] = useState(null); // { lat, lng }
  const [myTargetName, setMyTargetName] = useState('MISSION TARGET'); // New state for target name
  const [myRoutePath, setMyRoutePath] = useState(null); // Array of [lat, lng]
  const [candidateRoutes, setCandidateRoutes] = useState([]); // Array of route objects
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showLinkModal, setShowLinkModal] = useState(false); // New state for Link Modal

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isTracking, setIsTracking] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true); // New state for auto-following
  const [trackingUnitId, setTrackingUnitId] = useState(null); // ID of the unit currently being followed
  const watchIdRef = useRef(null);
  const hasCenteredMap = useRef(false);

  // Component to handle map clicks and drags to disable auto-follow
  const MapEvents = () => {
    useMapEvents({
      dragstart() {
        setAutoFollow(false);
        setStatusMsg('MANUAL SCAN MODE');
      },
    });
    return null;
  };

  // Use Email as Unit ID (or part of it)
  useEffect(() => {
    if (session?.user?.email) {
        // Use the part before @ as the ID for simplicity
        const emailId = session.user.email.split('@')[0].toUpperCase();
        setMyUnitId(emailId);
        setTrackingUnitId(emailId); // Default to tracking self
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

  // Continuous Location Tracking (Web optimized)
  const startTracking = () => {
    if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setStatusMsg('INITIALIZING TRACKER...');
    setIsTracking(true);

    if (!navigator.geolocation) {
        setStatusMsg('ERR: GEO_NOT_SUPPORTED');
        setIsTracking(false);
        return;
    }

    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const { latitude, longitude, speed } = pos.coords;
            const newPos = [latitude, longitude];
            
            setUserLocation(newPos);
            
            // Auto-follow logic: only if autoFollow is ON AND we are tracking OURSELVES
            if (autoFollow && trackingUnitId === myUnitId) {
                setPosition(newPos);
            }
            
            // If this is the first update, center map
            if (!hasCenteredMap.current) {
                setPosition(newPos); 
                hasCenteredMap.current = true;
                setIsOnline(true);
                setStatusMsg('TARGET LOCKED');
            } else {
                setIsOnline(true);
                if (autoFollow && trackingUnitId === myUnitId) {
                    setStatusMsg(`TRACKING | SPD: ${speed ? Math.round(speed * 3.6) : 0} KM/H`);
                }
            }
        },
        (err) => {
            console.error("Tracking Error:", err);
            setStatusMsg('SIGNAL LOST - RETRYING...');
            setIsOnline(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    watchIdRef.current = watchId;
  };

  // Auto-Locate on Mount
  useEffect(() => {
    startTracking();
    return () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
    };
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
            last_updated: new Date().toISOString(),
            unit_type: unitType, // Added unit_type to payload
            // Explicitly set to null if undefined to clear them in DB
            target_lat: myTarget ? myTarget.lat : null,
            target_lng: myTarget ? myTarget.lng : null,
            route_path: myRoutePath ? myRoutePath : null
        };

        const { error } = await supabase
          .from('locations')
          .upsert(payload);
        
        if (error) console.error('Sync Error:', error);
        else {
            setIsOnline(true);
            setLastSyncTime(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('Sync Exception:', err);
        setIsOnline(false);
      }
    };

    // Sync immediately then every 3 seconds (faster for driving)
    syncLocation();
    const interval = setInterval(syncLocation, 3000);
    return () => clearInterval(interval);
  }, [userLocation, myUnitId, myTarget, myRoutePath]);

  // Subscribe to Squad Updates
  useEffect(() => {
    if (!supabase) return;

    // Auto-follow logic for tracked unit
    if (autoFollow && trackingUnitId && trackingUnitId !== myUnitId) {
        const member = squadMembers[trackingUnitId];
        if (member) {
            setPosition([member.lat, member.lng]);
            setStatusMsg(`TRACKING UNIT: ${trackingUnitId}`);
        }
    }

    // Fetch initial locations of all users
    const fetchInitialLocations = async () => {
        const { data, error } = await supabase
            .from('locations')
            .select('*');
        
        if (data) {
            const members = {};
            data.forEach(member => {
                if (member.unit_id !== myUnitId) {
                    members[member.unit_id] = {
                        lat: member.lat,
                        lng: member.lng,
                        lastUpdate: new Date(member.last_updated),
                        route_path: member.route_path,
                        target_lat: member.target_lat,
                        target_lng: member.target_lng,
                        unit_type: member.unit_type // Added unit_type
                    };
                } else if (member.unit_id === myUnitId) {
                    // Sync my unit type from DB if available
                    if (member.unit_type) setUnitType(member.unit_type);
                }
            });
            setSquadMembers(prev => ({ ...prev, ...members }));
        }
    };

    fetchInitialLocations();

    const channel = supabase
      .channel('public:locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, (payload) => {
        // Handle INSERT and UPDATE
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { unit_id, lat, lng, route_path, target_lat, target_lng, last_updated, unit_type } = payload.new;
            if (unit_id !== myUnitId) {
                setSquadMembers(prev => ({
                    ...prev,
                    [unit_id]: { 
                        lat, 
                        lng, 
                        lastUpdate: new Date(last_updated),
                        route_path, 
                        target_lat,
                        target_lng,
                        unit_type // Added unit_type
                    }
                }));
            }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myUnitId, trackingUnitId, squadMembers, autoFollow]);

  // Generate a consistent neon color for each user
  const getUserColor = (userId) => {
    const colors = [
      '#00ff00', // Green
      '#00ffff', // Cyan
      '#ff00ff', // Magenta
      '#ffff00', // Yellow
      '#ff9900', // Orange
      '#ff0000', // Red
      '#0099ff', // Blue
      '#ccff00'  // Lime
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleLocateMe = () => {
    setTrackingUnitId(myUnitId); // Switch back to tracking self
    setAutoFollow(true); // Re-enable auto-following
    if (userLocation) {
        setPosition(userLocation);
        setStatusMsg('RE-CENTERING TARGET...');
        setTimeout(() => {
             setStatusMsg('TRACKING SELF');
        }, 1000);
    } else {
        setStatusMsg('SEARCHING FOR SIGNAL...');
        startTracking();
    }
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

  // Admin function to change unit type (only for ruger)
  const changeUnitType = async (targetUnitId, newType) => {
    const isAdmin = myUnitId.toLowerCase() === 'ruger' || session?.user?.email === 'ruger@1.com';
    
    if (!isAdmin) {
      setStatusMsg('ERR: UNAUTHORIZED ACCESS');
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .update({ unit_type: newType })
        .eq('unit_id', targetUnitId);

      if (error) throw error;
      
      setStatusMsg(`UNIT ${targetUnitId} UPDATED TO ${newType.toUpperCase()}`);
    } catch (err) {
      console.error('Update Error:', err);
      setStatusMsg('ERR: UPDATE FAILED');
    }
  };

  // Handle setting a mission target
  const handleSetMissionTarget = async (latlng, name = 'MISSION TARGET', autoConfirm = false) => {
    setIsTargetMode(false);
    setMyTarget(latlng);
    setMyTargetName(name); // Store target name
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
            
            if (autoConfirm) {
                // Automatically select the first (fastest) route
                setMyRoutePath(routes[0].coords);
                setCandidateRoutes([]); // Clear candidates so panel doesn't show
                setStatusMsg(`ROUTE ${routes[0].name} ENGAGED AUTOMATICALLY`);
            } else {
                setCandidateRoutes(routes);
                setSelectedRouteIndex(0);
                setStatusMsg(routes.length > 1 ? 'ROUTES ACQUIRED. AWAITING SELECTION.' : 'OPTIMAL ROUTE ACQUIRED. NO ALTERNATIVES.');
            }
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

  // Search Logic with Debounce
  const performSearch = async (query) => {
    setIsSearching(true);
    setStatusMsg(`SCANNING: ${query.toUpperCase()}...`);

    try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ar`;
        
        // Add proximity bias if user location is known
        if (userLocation) {
            // Create a bounding box of roughly 50km around user
            // 1 degree lat approx 111km
            const boxSize = 0.5; 
            const viewbox = `${userLocation[1]-boxSize},${userLocation[0]+boxSize},${userLocation[1]+boxSize},${userLocation[0]-boxSize}`;
            url += `&viewbox=${viewbox}&bounded=1`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        setSearchResults(data);
        if (data.length === 0) {
            setStatusMsg('NO TARGETS FOUND');
        }
    } catch (error) {
        console.error("Search Error:", error);
    } finally {
        setIsSearching(false);
    }
  };

  useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        if (searchQuery.length > 2) {
          performSearch(searchQuery);
        } else {
            setSearchResults([]);
        }
      }, 800); // 800ms delay to avoid spamming API

      return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const selectSearchResult = (result) => {
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      
      // Fly to the location
      setPosition([lat, lon]); 
      
      // Clear search UI
      setSearchResults([]); 
      setSearchQuery(''); 
      
      // Set as Mission Target and Calculate Route
      handleSetMissionTarget({ lat, lng: lon }, result.display_name.split(',')[0], true);
      
      setStatusMsg(`TARGET LOCKED: ${result.display_name.split(',')[0]}`);
  };

  return (
    <div className="map-wrapper">
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true} 
        className={`leaflet-map ${isTargetMode ? 'crosshair-cursor' : ''}`}
      >
        <MapEvents />
        <TrafficLayer />
        <MapFlyTo position={position} />
        <MapClickHandler isTargetMode={isTargetMode} onTargetSet={handleSetMissionTarget} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={getUnitIcon(unitType, true)}>
            <Popup>
              <div className="hacker-popup">
                <h3 style={{color: 'red', borderColor: 'red'}}>MY UNIT: {myUnitId}</h3>
                <p>TYPE: {unitType.toUpperCase()}</p>
                <p>STATUS: <span style={{color: isOnline ? '#00ff00' : 'red'}}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span></p>
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

        {/* My Mission Route (White on Map - Code Black) */}
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
                        <div className="hacker-popup" style={{
                            borderColor: '#00ffff',
                            backgroundColor: '#000000', // Black background
                            color: '#00ffff',           // Cyan text
                            // IMPORTANT: Reverse the map's filter so colors are true
                            filter: 'invert(100%) hue-rotate(180deg)',
                            boxShadow: '0 0 10px #00ffff',
                            padding: '10px',
                            minWidth: '150px'
                        }}>
                            <h3 style={{
                                color: '#00ffff', 
                                borderColor: '#00ffff',
                                borderBottom: '1px solid #00ffff',
                                paddingBottom: '5px',
                                marginBottom: '5px',
                                fontSize: '14px',
                                textAlign: 'center',
                                textTransform: 'uppercase'
                            }}>{myTargetName}</h3>
                            <div style={{fontSize: '10px', color: '#ffffff'}}>
                                <p style={{margin: '2px 0'}}>STATUS: LOCKED</p>
                                <p style={{margin: '2px 0'}}>LAT: {myRoutePath[myRoutePath.length - 1][0].toFixed(4)}</p>
                                <p style={{margin: '2px 0'}}>LNG: {myRoutePath[myRoutePath.length - 1][1].toFixed(4)}</p>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            </>
        )}

        {/* Squad Members (Blue/Green Tactical) */}
        {Object.entries(squadMembers).map(([id, data]) => {
            // Check if member is online (updated in last 2 minutes)
            const isMemberOnline = (new Date() - new Date(data.lastUpdate)) < 120000;

            // Only show online members
            if (!isMemberOnline) return null;

            const distance = userLocation 
                 ? calculateDistance(userLocation[0], userLocation[1], data.lat, data.lng)
                 : 0;
            
            return (
              <div key={id}>
                {/* Tactical Line (Green - Link) - Always visible if user has location */}
                {userLocation && (
                    <Polyline 
                        positions={[userLocation, [data.lat, data.lng]]}
                        pathOptions={{ color: '#00ff00', weight: 2, opacity: 0.8 }}
                    >
                        <Tooltip permanent direction="center" className="tactical-tooltip" opacity={0.9}>
                            {distance > 1000 ? (distance/1000).toFixed(1) + 'km' : distance + 'm'}
                        </Tooltip>
                    </Polyline>
                )}

                <Marker position={[data.lat, data.lng]} icon={getUnitIcon(data.unit_type || 'infantry', false)} opacity={1}>
                  <Popup>
                    <div className="hacker-popup">
                      <h3>UNIT: {id}</h3>
                      <p>TYPE: {(data.unit_type || 'infantry').toUpperCase()}</p>
                      <p>STATUS: ONLINE</p>
                      <p>LAST SEEN: {new Date(data.lastUpdate).toLocaleTimeString()}</p>
                      <p>DIST: {distance}m</p>
                      <p>LAT: {data.lat.toFixed(4)}</p>
                      <p>LNG: {data.lng.toFixed(4)}</p>
                    </div>
                  </Popup>
                </Marker>
                {/* Show Squad Route (Glowing White on Inverted Map -> Black Code) */}
                {data.route_path && (
                    <>
                        {/* Glow Effect Layer */}
                        <Polyline 
                            positions={data.route_path}
                            pathOptions={{ color: '#000000', weight: 6, opacity: 0.3 }}
                        />
                        {/* Main Line Layer */}
                        <Polyline 
                            positions={data.route_path}
                            pathOptions={{ color: '#000000', weight: 3, opacity: 0.9 }}
                        >
                            <Tooltip sticky className="tactical-tooltip">UNIT {id} PATH</Tooltip>
                        </Polyline>
                    </>
                )}
                {/* Show Squad Target if available */}
                {data.target_lat && (
                    <Marker position={[data.target_lat, data.target_lng]} icon={targetIcon} opacity={0.7}>
                         <Tooltip sticky className="tactical-tooltip">UNIT {id} TARGET</Tooltip>
                    </Marker>
                )}
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
          <div className="top-hud-container">
              <div className="top-left" 
                   onClick={() => {
                       setTrackingUnitId(myUnitId);
                       setAutoFollow(true);
                       if (userLocation) setPosition(userLocation);
                       setStatusMsg('TRACKING SELF');
                   }}
                   style={{cursor: 'pointer'}}
              >
                  <div>SYS.OP: {isOnline ? 'ONLINE' : 'OFFLINE'}</div>
                  <div>ID: <span style={{color: '#00ff00'}}>{myUnitId}</span></div>
              </div>

              {/* SEARCH BAR (CENTERED IN TOP CONTAINER) */}
              <div 
                  className="search-container-hud"
                  style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: '10px',
                      width: '40%',
                      minWidth: '280px',
                      pointerEvents: 'auto',
                      zIndex: 9999
                  }}
              >
                  <input 
                      type="text" 
                      placeholder="[ SEARCH SECTOR... ]" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input-hud"
                      style={{
                          width: '100%',
                          padding: '12px',
                          background: 'rgba(0, 0, 0, 0.9)',
                          border: '2px solid #00ffff',
                          color: '#00ffff',
                          fontFamily: 'Courier New',
                          fontSize: '14px',
                          textAlign: 'center',
                          outline: 'none',
                          boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                          textTransform: 'uppercase',
                          borderRadius: '4px'
                      }}
                  />
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                      <div 
                          className="search-results-dropdown"
                          style={{
                              background: 'rgba(0, 0, 0, 0.98)',
                              border: '1px solid #00ffff',
                              marginTop: '5px',
                              maxHeight: '250px',
                              overflowY: 'auto',
                              boxShadow: '0 0 30px rgba(0, 0, 0, 0.9)'
                          }}
                      >
                          {searchResults.map((result, idx) => (
                              <div 
                                  key={idx}
                                  onClick={() => selectSearchResult(result)}
                                  className="search-result-item"
                                  style={{
                                      padding: '10px',
                                      color: '#fff',
                                      borderBottom: '1px solid #003333',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontFamily: 'Courier New',
                                      textAlign: 'right',
                                      direction: 'rtl'
                                  }}
                              >
                                  {result.display_name}
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="top-right" style={{minWidth: '150px'}}>
              <div style={{marginBottom: '5px', borderBottom: '1px solid #00ff00', fontSize: '12px', fontWeight: 'bold'}}>ACTIVE SQUAD UNITS</div>
              <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                  {Object.entries(squadMembers)
                      .filter(([id, m]) => (new Date() - new Date(m.lastUpdate)) < 60000) // Online within 1 minute (Fast Response)
                      .map(([id, m]) => {
                          const distance = userLocation 
                              ? calculateDistance(userLocation[0], userLocation[1], m.lat, m.lng) 
                              : 0;
                          const distanceStr = distance > 1000 ? (distance/1000).toFixed(1) + 'km' : distance + 'm';
                          const userColor = getUserColor(id);

                          return (
                              <div key={id} className="squad-member-item" style={{ marginBottom: '8px' }}>
                                  <div 
                                          style={{
                                              color: userColor, 
                                              cursor: 'pointer', 
                                              fontSize: '12px',
                                              padding: '4px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              borderBottom: `1px solid ${userColor}33`, 
                                              background: trackingUnitId === id ? `${userColor}22` : 'transparent',
                                              borderRadius: '2px',
                                              transition: 'background 0.2s'
                                          }}
                                          onClick={() => {
                                              setTrackingUnitId(id);
                                              setAutoFollow(true);
                                              setPosition([m.lat, m.lng]); 
                                              setStatusMsg(`TRACKING UNIT: ${id}`);
                                          }}
                                  >
                                      <span style={{fontWeight: 'bold', textShadow: `0 0 5px ${userColor}`}}>
                                          • {id} [{(m.unit_type || 'INF').substring(0, 3).toUpperCase()}]
                                      </span>
                                      <span style={{fontSize: '10px', color: '#aaa'}}>{distanceStr}</span>
                                  </div>
                                  
                                  {/* Admin Controls for Ruger */}
                                  {(myUnitId.toLowerCase() === 'ruger' || session?.user?.email === 'ruger@1.com') && (
                                      <div style={{ display: 'flex', gap: '5px', marginTop: '2px', paddingLeft: '10px' }}>
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); changeUnitType(id, 'infantry'); }}
                                              style={{ fontSize: '8px', background: 'transparent', border: '1px solid #00ff00', color: '#00ff00', cursor: 'pointer' }}
                                          >INF</button>
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); changeUnitType(id, 'driver'); }}
                                              style={{ fontSize: '8px', background: 'transparent', border: '1px solid #00ff00', color: '#00ff00', cursor: 'pointer' }}
                                          >DRV</button>
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); changeUnitType(id, 'soldier'); }}
                                              style={{ fontSize: '8px', background: 'transparent', border: '1px solid #00ff00', color: '#00ff00', cursor: 'pointer' }}
                                          >SLD</button>
                                      </div>
                                  )}
                              </div>
                          );
                      })
                  }
                  {Object.values(squadMembers).filter(m => (new Date() - new Date(m.lastUpdate)) < 3600000).length === 0 && (
                      <div style={{color: '#555', fontSize: '10px', padding: '5px'}}>NO ACTIVE UNITS IN RANGE</div>
                  )}
              </div>
              <button onClick={handleLogout} className="logout-btn" style={{marginTop: '10px', width: '100%', fontSize: '10px'}}>[ EXIT SYSTEM ]</button>
          </div>
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
              <div>STATUS: {statusMsg}</div>
              {lastSyncTime && (
                  <div style={{fontSize: '9px', color: '#00ff00', opacity: 0.8}}>
                      LAST SYNC: {lastSyncTime}
                  </div>
              )}
              <div style={{
                  fontSize: '10px', 
                  color: '#00ffff', 
                  marginTop: '4px', 
                  letterSpacing: '1px',
                  fontWeight: 'bold',
                  textShadow: '0 0 5px #00ffff'
              }}>
                  DEVELOPED BY RUGER IQ
              </div>
          </div>
          
          {/* Center Crosshair (Hidden in Target Mode) */}
          {!isTargetMode && <div className="crosshair"></div>}

          {/* Chat Component */}
          {myUnitId && <ChatComponent myUnitId={myUnitId} session={session} />}
      </div>
    </div>
  );
};

export default MapComponent;
