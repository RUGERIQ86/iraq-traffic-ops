import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function useAuthSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSession(session)
      } catch (err) {
        console.error('Auth Check Failed:', err)
      } finally {
        setLoading(false)
      }
    }

    if (supabase) {
      checkUser()
    } else {
      setLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading, setSession }
}

export default useAuthSession

