import MapComponent from './MapComponent'
import Login from './Login'
import './App.css'
import useAuthSession from './hooks/useAuthSession'
import LocationGuard from './LocationGuard'

function App() {
  const { session, loading, setSession } = useAuthSession()

  if (loading) {
    return <div className="loading-screen">INITIALIZING SYSTEM...</div>
  }

  return (
    <LocationGuard>
      {!session ? (
        <Login onLogin={setSession} />
      ) : (
        <MapComponent session={session} />
      )}
    </LocationGuard>
  )
}

export default App
