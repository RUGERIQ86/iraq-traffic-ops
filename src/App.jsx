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
          
          // Only force logout if we are SURE the user is invalid (401/403 or null user)
          if (!user || (userError && (userError.status === 401 || userError.status === 403 || userError.message.includes('bad request')))) {
            console.warn("User invalid or deleted from database. Forcing logout.");
            // Clear local storage explicitly to prevent loops
            localStorage.clear();
            await supabase.auth.signOut();
            setSession(null);
          } else {
            // If it's a network error or other temporary issue, keep the session if it looks valid
            if (userError) {
                console.warn("getUser failed but session exists. Keeping session.", userError);
            }
            setSession(session);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Auth Check Failed:", err);
        // On error, set session to null but DO NOT clear local storage aggressively
        setSession(null);
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
