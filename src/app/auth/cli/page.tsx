'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/client'
import PolydevLogo from '../../../components/PolydevLogo'

interface Token {
  id: string
  token_name: string
  token_preview: string
  full_token?: string
  created_at: string
  active: boolean
}

function CLIAuthContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [newTokenName, setNewTokenName] = useState('CLI Token')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedCommand, setCopiedCommand] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || 'claude-code'
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch existing tokens via API
        const response = await fetch('/api/mcp/tokens')
        if (response.ok) {
          const data = await response.json()
          setTokens(data.tokens || [])
        }
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/cli?redirect=${redirect}`
        }
      })
      if (error) throw error
    } catch (error: any) {
      console.error('OAuth error:', error)
    }
  }

  const createToken = async () => {
    if (!user) return
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/mcp/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token_name: newTokenName || 'CLI Token',
          expires_in_days: 365
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token')
      }

      // The API returns the full token only once
      setCreatedToken(data.api_key)
      setTokens([data.token, ...tokens])
    } catch (err: any) {
      console.error('Error creating token:', err)
      setError(err.message || 'Failed to create token')
    } finally {
      setIsCreating(false)
    }
  }

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCommand = async (token: string) => {
    const command = `echo 'export POLYDEV_USER_TOKEN="${token}"' >> ~/.zshrc && source ~/.zshrc`
    await navigator.clipboard.writeText(command)
    setCopiedCommand(true)
    setTimeout(() => setCopiedCommand(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  // Not authenticated - show OAuth options
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-amber-500/10 p-3 rounded-xl">
                  <PolydevLogo size={48} className="text-amber-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Connect to Polydev
              </h1>
              <p className="text-slate-400 text-sm">
                Authenticate to get your API token for {redirect === 'claude-code' ? 'Claude Code' : redirect}
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuthSignIn('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 rounded-xl transition-all duration-200 group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-semibold text-slate-900">
                  Continue with Google
                </span>
              </button>

              <button
                onClick={() => handleOAuthSignIn('github')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-950 border border-slate-700 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12z"/>
                </svg>
                <span className="text-sm font-semibold text-white">
                  Continue with GitHub
                </span>
              </button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-slate-500">
              Free tier includes 500 API calls/month
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated - show token
  // Use createdToken if just created, otherwise try to get full_token from existing tokens
  const displayToken = createdToken || (tokens.length > 0 && tokens[0].full_token ? tokens[0].full_token : null)
  const hasExistingToken = tokens.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 shadow-2xl">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className={`${createdToken ? 'bg-green-500/10' : 'bg-amber-500/10'} p-3 rounded-full`}>
                {createdToken ? (
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <PolydevLogo size={32} className="text-amber-500" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {createdToken ? 'Token Created!' : 'Welcome Back!'}
            </h1>
            <p className="text-slate-400 text-sm">
              {createdToken 
                ? 'Copy your token below - it won\'t be shown again!' 
                : hasExistingToken && !displayToken
                  ? 'You have existing tokens. Create a new one or manage them in the dashboard.'
                  : displayToken 
                    ? 'Copy your token below to connect Claude Code' 
                    : 'Create a token to get started'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {displayToken ? (
            <>
              {/* Token Display */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Your API Token
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-amber-400 font-mono text-sm overflow-x-auto">
                    {displayToken}
                  </code>
                  <button
                    onClick={() => copyToken(displayToken)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                    }`}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Setup Instructions */}
              <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="bg-amber-500 text-slate-900 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Add to your shell
                </h3>
                <div className="flex gap-2">
                  <code className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs overflow-x-auto">
                    echo 'export POLYDEV_USER_TOKEN="{displayToken.slice(0, 10)}..."' {'>>'} ~/.zshrc
                  </code>
                  <button
                    onClick={() => copyCommand(displayToken)}
                    className={`px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                      copiedCommand
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {copiedCommand ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-slate-900 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Restart Claude Code
                </h3>
                <p className="text-slate-400 text-xs">
                  Close and reopen Claude Code, then run <code className="text-amber-400">/mcp</code> to verify connection.
                </p>
              </div>

              {/* Quick Test */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">✨ Quick Test</h3>
                <p className="text-slate-300 text-xs">
                  After setup, try: "Get polydev perspectives on best practices for error handling"
                </p>
              </div>
            </>
          ) : (
            /* No token - create one */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Token Name
                </label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g., Claude Code Token"
                />
              </div>
              <button
                onClick={createToken}
                disabled={isCreating}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          )}

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-slate-700 flex justify-between text-xs">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              Go to Dashboard →
            </Link>
            <Link href="/dashboard/mcp-tokens" className="text-slate-400 hover:text-white transition-colors">
              Manage Tokens
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CLIAuth() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    }>
      <CLIAuthContent />
    </Suspense>
  )
}
