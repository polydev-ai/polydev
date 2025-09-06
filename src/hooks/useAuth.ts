'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../app/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { cliValidationService } from '../services/cliValidationService'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [cliValidationInProgress, setCLIValidationInProgress] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      // Trigger CLI validation after successful authentication
      if (session?.user && !cliValidationInProgress) {
        await triggerCLIValidation(session.user)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        // Trigger CLI validation on sign in events
        if (event === 'SIGNED_IN' && session?.user && !cliValidationInProgress) {
          await triggerCLIValidation(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, cliValidationInProgress])

  /**
   * Trigger CLI validation after authentication
   */
  const triggerCLIValidation = async (user: User) => {
    try {
      setCLIValidationInProgress(true)
      console.log('🔍 Triggering CLI validation after authentication...')

      // Get MCP token for the user
      const mcpToken = await getMCPToken(user.id)
      if (!mcpToken) {
        console.log('⚠️ No MCP token found, skipping CLI validation')
        return
      }

      // Trigger CLI validation with user feedback
      await cliValidationService.validateAllCLIs({
        userId: user.id,
        mcpToken: mcpToken,
        onProgress: (provider: string, status: string) => {
          console.log(`📊 CLI validation progress: ${provider} = ${status}`)
        },
        onComplete: (results) => {
          console.log('✅ CLI validation completed:', results)
          // Optionally show notification to user
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('CLI Validation Complete', {
                body: `Validated ${results.length} CLI tools`,
                icon: '/favicon.ico'
              })
            }
          }
        }
      })

    } catch (error: any) {
      console.error('❌ CLI validation failed:', error)
    } finally {
      setCLIValidationInProgress(false)
    }
  }

  /**
   * Get MCP token for CLI validation
   */
  const getMCPToken = async (userId: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/mcp-tokens')
      if (!response.ok) return null

      const data = await response.json()
      return data.token || null

    } catch (error) {
      console.error('Failed to get MCP token:', error)
      return null
    }
  }

  /**
   * Manually trigger CLI validation
   */
  const validateCLITools = async (): Promise<void> => {
    if (!user || cliValidationInProgress) return

    await triggerCLIValidation(user)
  }

  /**
   * Trigger re-authentication flow for CLI validation
   */
  const reAuthenticateForCLI = async (): Promise<void> => {
    try {
      // Sign out and sign back in to trigger validation
      await supabase.auth.signOut()
      
      // Redirect to sign in page with return URL
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `/login?returnUrl=${returnUrl}&trigger=cli-validation`
      
    } catch (error) {
      console.error('Re-authentication failed:', error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    cliValidationInProgress,
    validateCLITools,
    reAuthenticateForCLI
  }
}