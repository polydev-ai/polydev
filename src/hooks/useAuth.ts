'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '../app/utils/supabase/client'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Use getUser() to validate session with server (ensures sync with middleware)
  const refreshAuth = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.log('[useAuth] Session validation error:', error.message)
        setUser(null)
      } else {
        setUser(user)
      }
    } catch (err) {
      console.error('[useAuth] Auth check failed:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  useEffect(() => {
    // Validate session with server on mount
    refreshAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state changed:', event)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        } else {
          // For other events, revalidate with server
          await refreshAuth()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, refreshAuth])


  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    // Redirect to auth page after sign out
    if (typeof window !== 'undefined') {
      window.location.href = '/auth'
    }
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    refreshAuth
  }
}