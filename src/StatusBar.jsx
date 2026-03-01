const StatusBar = ({ statusMsg, lastSyncTime }) => {
  return (
    <div className="status-bar">
      <div>STATUS: {statusMsg}</div>
      {lastSyncTime && (
        <div style={{ fontSize: '9px', color: '#00ff00', opacity: 0.8 }}>
          LAST SYNC: {lastSyncTime}
        </div>
      )}
      <div
        style={{
          fontSize: '10px',
          color: '#00ffff',
          marginTop: '4px',
          letterSpacing: '1px',
          fontWeight: 'bold',
          textShadow: '0 0 5px #00ffff',
        }}
      >
        DEVELOPED BY RUGER IQ
      </div>
    </div>
  )
}

export default StatusBar

