import { useState, useEffect } from 'react'
import MapComponent from './MapComponent'
import Login from './Login'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session AND validate user existence
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // STRICT CHECK: Validate user with server to ensure they aren't deleted
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.warn("User invalid or deleted from database. Forcing logout.");
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // On new sign-in or token refresh, re-verify user exists
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         const { error } = await supabase.auth.getUser();
         if (error) {
           console.warn("Auth change verification failed. Logging out.");
           await supabase.auth.signOut();
           setSession(null);
           return;
         }
      }
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
