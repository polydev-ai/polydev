'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/client'
import PolydevLogo from '../../../components/PolydevLogo'

function DeviceAuthContent() {
  const [status, setStatus] = useState<'loading' | 'login' | 'confirm' | 'success' | 'error'>('loading')
  const [userCode, setUserCode] = useState('')
  const [user, setUser] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setUserCode(code.toUpperCase())
    }
    checkAuth()
  }, [searchParams])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setStatus('confirm')
    } else {
      setStatus('login')
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/device/callback?code=${userCode}`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setErrorMessage(error.message || `An error occurred with ${provider} authentication`)
    }
  }

  const handleAuthorize = async () => {
    if (!user || !userCode) return

    setIsAuthorizing(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/mcp/device-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          user_code: userCode,
          user_id: user.id,
          approved: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
      } else {
        setErrorMessage(data.message || 'Failed to authorize device')
        setStatus('error')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to authorize device')
      setStatus('error')
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleDeny = async () => {
    if (!user || !userCode) return

    try {
      await fetch('/api/mcp/device-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          user_code: userCode,
          user_id: user.id,
          approved: false
        })
      })

      router.push('/dashboard')
    } catch (error) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <PolydevLogo size={80} className="text-slate-900" />
              <span className="font-semibold text-2xl -ml-3">Polydev</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-32 pb-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">

            {/* Loading State */}
            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading...</p>
              </div>
            )}

            {/* Login Required State */}
            {status === 'login' && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Device Authorization</h2>
                  <p className="text-slate-600 text-sm">Sign in to authorize your CLI tool</p>
                </div>

                {/* Show code if provided */}
                {userCode && (
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Authorizing Code</p>
                    <p className="text-2xl font-mono font-bold text-slate-900 tracking-widest">{userCode}</p>
                  </div>
                )}

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleOAuthSignIn('google')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-900">Continue with Google</span>
                  </button>

                  <button
                    onClick={() => handleOAuthSignIn('github')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="text-sm font-semibold text-white">Continue with GitHub</span>
                  </button>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg text-center">
                    {errorMessage}
                  </div>
                )}
              </>
            )}

            {/* Confirmation State */}
            {status === 'confirm' && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Authorize Device</h2>
                  <p className="text-slate-600 text-sm">
                    Logged in as <span className="font-medium">{user?.email}</span>
                  </p>
                </div>

                {/* Code Display */}
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Confirm this code matches your CLI</p>
                  <p className="text-3xl font-mono font-bold text-slate-900 tracking-widest">{userCode}</p>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Only authorize if you initiated this</p>
                      <p className="text-xs text-amber-700 mt-1">This will grant CLI access to your Polydev account</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDeny}
                    className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Deny
                  </button>
                  <button
                    onClick={handleAuthorize}
                    disabled={isAuthorizing}
                    className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isAuthorizing ? 'Authorizing...' : 'Authorize'}
                  </button>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg text-center">
                    {errorMessage}
                  </div>
                )}
              </>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Device Authorized!</h2>
                <p className="text-slate-600 mb-6">Your CLI tool is now connected to Polydev.</p>
                <p className="text-sm text-slate-500 mb-6">You can close this window and return to your terminal.</p>
                <Link
                  href="/dashboard"
                  className="inline-block py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Authorization Failed</h2>
                <p className="text-slate-600 mb-4">{errorMessage || 'Something went wrong'}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Having trouble? <a href="mailto:support@polydev.ai" className="text-slate-700 hover:underline">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DeviceAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    }>
      <DeviceAuthContent />
    </Suspense>
  )
}
