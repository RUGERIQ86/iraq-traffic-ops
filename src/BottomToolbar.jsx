const BottomToolbar = ({
  isTargetMode,
  setIsTargetMode,
  userLocation,
  mapRef,
  myUnitId,
  setTrackingUnitId,
  setAutoFollow,
  setStatusMsg,
  myTarget,
  clearMission,
}) => {
  return (
    <div className="bottom-toolbar">
      <button
        className={`toolbar-btn ${isTargetMode ? 'active' : ''}`}
        onClick={() => setIsTargetMode(!isTargetMode)}
      >
        {isTargetMode ? 'CANCEL TARGET' : 'SET TARGET'}
      </button>

      <button
        className="toolbar-btn"
        onClick={() => {
          if (userLocation && mapRef.current) {
            setTrackingUnitId(myUnitId)
            setAutoFollow(true)
            mapRef.current.setView(userLocation, 16, { animate: true })
            setStatusMsg('LOCATING OPERATOR...')
          }
        }}
      >
        LOCATE ME
      </button>

      {myTarget && (
        <button className="toolbar-btn danger" onClick={clearMission}>
          ABORT
        </button>
      )}
    </div>
  )
}

export default BottomToolbar

