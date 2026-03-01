import MapComponent from './MapComponent'
import Login from './Login'
import './App.css'
import useAuthSession from './hooks/useAuthSession'

function App() {
  const { session, loading, setSession } = useAuthSession()

  if (loading) {
    return <div className="loading-screen">INITIALIZING SYSTEM...</div>
  }

  return (
    <>
      {!session ? (
        <Login onLogin={setSession} />
      ) : (
        <MapComponent session={session} />
      )}
    </>
  )
}

export default App
