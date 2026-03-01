import MapComponent from './MapComponent'
import Login from './Login'
import './App.css'
import useAuthSession from './hooks/useAuthSession'
import LocationGuard from './LocationGuard'
// 1. استيراد حاوية الإشعارات
import { Toaster } from 'react-hot-toast' 

function App() {
  const { session, loading, setSession } = useAuthSession()

  if (loading) {
    return <div className="loading-screen">INITIALIZING SYSTEM...</div>
  }

  return (
    <LocationGuard>
      {/* 2. إضافة الحاوية هنا لتظهر الإشعارات فوق كل شيء */}
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        toastOptions={{
          style: {
            background: '#000',
            color: '#00ff00',
            border: '1px solid #00ff00',
            fontFamily: 'monospace'
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