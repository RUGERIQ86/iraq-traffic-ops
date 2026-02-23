import { useState, useEffect } from 'react'
import MapComponent from './MapComponent'
import Login from './Login'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.error("Auth Check Failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (supabase) {
      checkUser();
    } else {
      setLoading(false);
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    })

    return () => subscription.unsubscribe()
  }, [])

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
