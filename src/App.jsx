// ... الاستيرادات السابقة تبقى كما هي

function App() {
  const { session, loading, setSession } = useAuthSession()

  if (loading) {
    return <div className="loading-screen">INITIALIZING SYSTEM...</div>
  }

  return (
    <LocationGuard>
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        // التعديل هنا: رفع مستوى الطبقة للحاوية بالكامل
        containerStyle={{
          zIndex: 99999, 
        }}
        toastOptions={{
          style: {
            background: '#000',
            color: '#00ff00',
            border: '1px solid #00ff00',
            fontFamily: 'monospace',
            fontSize: '14px',
            boxShadow: '0 0 15px rgba(0, 255, 0, 0.3)'
          }
        }}
      />
      
      {!session ? (
        <Login onLogin={setSession} />
      ) : (
        <MapComponent session={session} />
      )}
    </LocationGuard>
  )
}

export default App