const TopHUD = ({
  isOnline,
  myUnitId,
  userLocation,
  searchQuery,
  setSearchQuery,
  searchResults,
  selectSearchResult,
  squadMembers,
  trackingUnitId,
  setTrackingUnitId,
  setAutoFollow,
  setPosition,
  setStatusMsg,
  session,
  changeUnitType,
  calculateDistance,
  getUserColor,
  handleLogout,
}) => {
  return (
    <div className="top-hud-container">
      <div
        className="top-left"
        onClick={() => {
          setTrackingUnitId(myUnitId)
          setAutoFollow(true)
          if (userLocation) setPosition(userLocation)
          setStatusMsg('TRACKING SELF')
        }}
        style={{ cursor: 'pointer' }}
      >
        <div>SYS.OP: {isOnline ? 'ONLINE' : 'OFFLINE'}</div>
        <div>
          ID: <span style={{ color: '#00ff00' }}>{myUnitId}</span>
        </div>
      </div>

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
          zIndex: 9999,
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
            borderRadius: '4px',
          }}
        />
        {searchResults.length > 0 && (
          <div
            className="search-results-dropdown"
            style={{
              background: 'rgba(0, 0, 0, 0.98)',
              border: '1px solid #00ffff',
              marginTop: '5px',
              maxHeight: '250px',
              overflowY: 'auto',
              boxShadow: '0 0 30px rgba(0, 0, 0, 0.9)',
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
                  direction: 'rtl',
                }}
              >
                {result.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="top-right" style={{ minWidth: '150px' }}>
        <div
          style={{
            marginBottom: '5px',
            borderBottom: '1px solid #00ff00',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          ACTIVE SQUAD UNITS
        </div>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {Object.entries(squadMembers)
            .filter(([id, m]) => new Date() - new Date(m.lastUpdate) < 60000)
            .map(([id, m]) => {
              const distance = userLocation
                ? calculateDistance(userLocation[0], userLocation[1], m.lat, m.lng)
                : 0
              const distanceStr =
                distance > 1000 ? (distance / 1000).toFixed(1) + 'km' : distance + 'm'
              const userColor = getUserColor(id)

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
                      transition: 'background 0.2s',
                    }}
                    onClick={() => {
                      setTrackingUnitId(id)
                      setAutoFollow(true)
                      setPosition([m.lat, m.lng])
                      setStatusMsg(`TRACKING UNIT: ${id}`)
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 'bold',
                        textShadow: `0 0 5px ${userColor}`,
                      }}
                    >
                      • {id} [{(m.unit_type || 'INF').substring(0, 3).toUpperCase()}]
                    </span>
                    <span style={{ fontSize: '10px', color: '#aaa' }}>{distanceStr}</span>
                  </div>

                  {session?.user?.email === 'ruger@1.com' && (
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '5px',
                        padding: '5px',
                        background: 'rgba(0, 255, 0, 0.1)',
                        borderRadius: '4px',
                        border: '1px solid #00ff0044',
                        pointerEvents: 'auto',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          changeUnitType(id, 'infantry')
                        }}
                        style={{
                          flex: 1,
                          fontSize: '10px',
                          background: '#000',
                          border: '1px solid #00ff00',
                          color: '#00ff00',
                          cursor: 'pointer',
                          padding: '4px 0',
                        }}
                      >
                        INF
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          changeUnitType(id, 'driver')
                        }}
                        style={{
                          flex: 1,
                          fontSize: '10px',
                          background: '#000',
                          border: '1px solid #00ff00',
                          color: '#00ff00',
                          cursor: 'pointer',
                          padding: '4px 0',
                        }}
                      >
                        DRV
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          changeUnitType(id, 'soldier')
                        }}
                        style={{
                          flex: 1,
                          fontSize: '10px',
                          background: '#000',
                          border: '1px solid #00ff00',
                          color: '#00ff00',
                          cursor: 'pointer',
                          padding: '4px 0',
                        }}
                      >
                        SLD
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          {Object.values(squadMembers).filter(
            (m) => new Date() - new Date(m.lastUpdate) < 3600000,
          ).length === 0 && (
            <div style={{ color: '#555', fontSize: '10px', padding: '5px' }}>
              NO ACTIVE UNITS IN RANGE
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="logout-btn"
          style={{ marginTop: '10px', width: '100%', fontSize: '10px' }}
        >
          [ EXIT SYSTEM ]
        </button>
      </div>
    </div>
  )
}

export default TopHUD

