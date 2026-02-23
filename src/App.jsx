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
      // Safety timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn("Auth check timed out. Forcing UI load.");
        setLoading(false);
      }, 5000); // 5 seconds max wait

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session) {
          // STRICT CHECK: Validate user with server to ensure they aren't deleted
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.warn("User invalid or deleted from database. Forcing logout.");
            // Clear local storage explicitly to prevent loops
            localStorage.clear();
            await supabase.auth.signOut();
            setSession(null);
          } else {
            setSession(session);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Auth Check Failed:", err);
        // On error, clear session to allow re-login
        setSession(null);
        localStorage.clear();
      } finally {
        clearTimeout(timeoutId);
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
