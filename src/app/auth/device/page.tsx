'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/client'
import PolydevLogo from '../../../components/PolydevLogo'

// Animated checkmark component
function AnimatedCheckmark() {
  return (
    <svg className="w-12 h-12" viewBox="0 0 52 52">
      <circle
        className="stroke-green-500"
        cx="26" cy="26" r="25"
        fill="none"
        strokeWidth="2"
        style={{
          strokeDasharray: 166,
          strokeDashoffset: 166,
          animation: 'stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards'
        }}
      />
      <path
        className="stroke-green-500"
        fill="none"
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 48,
          strokeDashoffset: 48,
          animation: 'stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards'
        }}
      />
      <style jsx>{`
        @keyframes stroke {
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  )
}

// Terminal-style code display
function TerminalCodeDisplay({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-1">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl"></div>
      <div className="relative bg-slate-900 rounded-xl p-6">
        {/* Terminal header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-xs text-slate-500 font-mono">{label}</span>
        </div>
        {/* Code display */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1">
            {code.split('').map((char, i) => (
              <span
                key={i}
                className={`text-4xl font-mono font-bold ${char === '-' ? 'text-slate-600' : 'text-white'}`}
                style={{
                  animation: `fadeIn 0.1s ease-out ${i * 0.05}s both`
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}

// IDE icons component
function IDEIcons() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {/* VSCode */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" title="VS Code">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <path d="M17.5 0L7 8.5 3 5.5 0 7v10l3 1.5 4-3L17.5 24l6.5-3V3l-6.5-3zM6.5 14.5L3 12l3.5-2.5v5zm11-1v-3l-4 2 4 1z" fill="#007ACC"/>
        </svg>
      </div>
      {/* Cursor */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" title="Cursor">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="4" fill="#000"/>
          <path d="M7 7h10v10H7V7z" fill="#fff"/>
        </svg>
      </div>
      {/* Claude */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" title="Claude Desktop">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#D97706"/>
          <path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      {/* Terminal */}
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" title="Terminal">
        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center group">
              <PolydevLogo size={80} className="text-slate-900 group-hover:scale-105 transition-transform" />
              <span className="font-semibold text-2xl -ml-3">Polydev</span>
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Secure connection
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-12 min-h-screen">
        <div className="max-w-md w-full">
          {/* Card with glass effect */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-20"></div>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 p-8 space-y-6 border border-white/50">

              {/* Loading State */}
              {status === 'loading' && (
                <div className="text-center py-12">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin"></div>
                  </div>
                  <p className="mt-6 text-slate-600 font-medium">Preparing authentication...</p>
                </div>
              )}

              {/* Login Required State */}
              {status === 'login' && (
                <>
                  <div className="text-center">
                    <div className="relative inline-flex">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-30"></div>
                      <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-white rounded-2xl flex items-center justify-center shadow-lg">
                        <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mt-6 mb-2">Connect Your IDE</h1>
                    <p className="text-slate-500">Sign in to authorize your development tools</p>
                  </div>

                  {/* Supported IDEs */}
                  <IDEIcons />

                  {/* Show code if provided */}
                  {userCode && (
                    <TerminalCodeDisplay code={userCode} label="Authorization Code" />
                  )}

                  {/* OAuth Buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleOAuthSignIn('google')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all duration-200 group shadow-sm hover:shadow"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-sm font-semibold text-slate-900">Continue with Google</span>
                    </button>

                    <button
                      onClick={() => handleOAuthSignIn('github')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-slate-900 hover:bg-slate-800 rounded-xl transition-all duration-200 group shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                      <svg className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="text-sm font-semibold text-white">Continue with GitHub</span>
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-xl text-center animate-shake">
                      {errorMessage}
                    </div>
                  )}
                </>
              )}

              {/* Confirmation State */}
              {status === 'confirm' && (
                <>
                  <div className="text-center">
                    <div className="relative inline-flex">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-30"></div>
                      <div className="relative w-20 h-20 bg-gradient-to-br from-green-50 to-white rounded-2xl flex items-center justify-center shadow-lg border border-green-100">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mt-6 mb-2">Authorize Access</h1>
                    <p className="text-slate-500">
                      Signed in as <span className="font-semibold text-slate-700">{user?.email}</span>
                    </p>
                  </div>

                  {/* Code Display */}
                  <TerminalCodeDisplay code={userCode} label="Verify this code matches your terminal" />

                  {/* What you're authorizing */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This will allow your IDE to:</p>
                    <ul className="space-y-2">
                      {[
                        'Query AI models on your behalf',
                        'Access your credit balance',
                        'Use your saved preferences'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Security Notice</p>
                        <p className="text-xs text-amber-700 mt-1">Only authorize if you initiated this request from your terminal.</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleDeny}
                      className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-200"
                    >
                      Deny
                    </button>
                    <button
                      onClick={handleAuthorize}
                      disabled={isAuthorizing}
                      className="flex-1 py-4 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02]"
                    >
                      {isAuthorizing ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Authorizing...
                        </span>
                      ) : 'Authorize'}
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-4 rounded-xl text-center">
                      {errorMessage}
                    </div>
                  )}
                </>
              )}

              {/* Success State */}
              {status === 'success' && (
                <div className="text-center py-8">
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-green-50 to-white rounded-full flex items-center justify-center shadow-lg border border-green-100">
                      <AnimatedCheckmark />
                    </div>
                  </div>

                  <h1 className="text-3xl font-bold text-slate-900 mb-3">You're Connected!</h1>
                  <p className="text-slate-600 mb-2">Your IDE is now linked to Polydev.</p>
                  <p className="text-sm text-slate-400 mb-8">You can close this window and return to your terminal.</p>

                  {/* Success animation */}
                  <div className="relative inline-flex items-center gap-3 px-6 py-3 bg-green-50 rounded-full mb-8">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">Token delivered to CLI</span>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href="/dashboard"
                      className="block w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => window.close()}
                      className="block w-full py-3 px-6 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                    >
                      Close this window
                    </button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="text-center py-8">
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-red-50 to-white rounded-full flex items-center justify-center shadow-lg border border-red-100">
                      <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>

                  <h1 className="text-3xl font-bold text-slate-900 mb-3">Authorization Failed</h1>
                  <p className="text-slate-600 mb-8">{errorMessage || 'Something went wrong. Please try again.'}</p>

                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="block w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all duration-200"
                    >
                      Try Again
                    </button>
                    <Link
                      href="/dashboard/mcp-tools"
                      className="block w-full py-3 px-6 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                    >
                      Get token manually
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              Secured by Polydev · <a href="mailto:support@polydev.ai" className="hover:text-slate-600 transition-colors">Need help?</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeviceAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin"></div>
        </div>
      </div>
    }>
      <DeviceAuthContent />
    </Suspense>
  )
}
