'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/client'
import { Shield, ExternalLink, Key, AlertCircle } from 'lucide-react'

function MCPAuthorizeContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')

  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const clientInfo = {
    'claude-desktop': {
      name: 'Claude Desktop',
      description: 'Anthropic\'s official Claude desktop application',
      icon: '🤖'
    },
    'cursor': {
      name: 'Cursor',
      description: 'AI-powered code editor',
      icon: '💻'
    },
    'continue': {
      name: 'Continue',
      description: 'VS Code extension for AI assistance',
      icon: '🔄'
    },
    'vscode-copilot': {
      name: 'VS Code with Copilot',
      description: 'Visual Studio Code with GitHub Copilot',
      icon: '📝'
    },
    'custom-mcp-client': {
      name: 'Custom MCP Client',
      description: 'Third-party MCP client application',
      icon: '⚡'
    }
  }

  const client = clientInfo[clientId as keyof typeof clientInfo] || {
    name: clientId || 'Unknown Client',
    description: 'MCP client application',
    icon: '❓'
  }

  async function handleAuthorize() {
    if (!user) {
      // Redirect to login
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/mcp-authorize?${searchParams.toString()}`
        }
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generate authorization code
      const response = await fetch('/api/mcp/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          state
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error_description || 'Authorization failed')
      }

      // Redirect back to the client with the authorization code
      const callbackUrl = new URL(redirectUri!)
      callbackUrl.searchParams.set('code', result.code)
      if (state) callbackUrl.searchParams.set('state', state)

      window.location.href = callbackUrl.toString()

    } catch (error) {
      console.error('Authorization error:', error)
      setError(error instanceof Error ? error.message : 'Authorization failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeny() {
    const callbackUrl = new URL(redirectUri!)
    callbackUrl.searchParams.set('error', 'access_denied')
    callbackUrl.searchParams.set('error_description', 'User denied the request')
    if (state) callbackUrl.searchParams.set('state', state)

    window.location.href = callbackUrl.toString()
  }

  if (!clientId || !redirectUri) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Request
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Missing required parameters for MCP authorization.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Authorize Access</h1>
              <p className="text-blue-100 text-sm">Model Context Protocol</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Client Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{client.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {client.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {client.description}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p className="break-all">Redirect URI: {redirectUri}</p>
            </div>
          </div>

          {/* Permissions */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              This application would like to:
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm">
                <Key className="w-4 h-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Access your configured AI providers through MCP tools
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <ExternalLink className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Make requests using your API keys and preferences
                </span>
              </div>
            </div>
          </div>

          {/* User Status */}
          {user ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-green-800 dark:text-green-200">
                Signed in as <strong>{user.email}</strong>
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You need to sign in to authorize this application
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleAuthorize}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Authorizing...' : user ? 'Authorize' : 'Sign In & Authorize'}
            </button>
            <button
              onClick={handleDeny}
              disabled={loading}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Deny
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>
              This will allow the application to make MCP tool calls on your behalf.
              You can revoke access anytime in your{' '}
              <a href="/dashboard/mcp-tokens" className="text-blue-600 hover:underline">
                MCP tokens dashboard
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MCPAuthorizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <MCPAuthorizeContent />
    </Suspense>
  )
}