'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '../../utils/supabase/client'
import { motion } from 'framer-motion'
import { Plus, Eye, EyeOff, Copy, Trash2, Key, AlertCircle, Check, Clock, ExternalLink, Terminal, Zap } from 'lucide-react'

interface MCPToken {
  id: string
  token_name: string
  token_preview: string
  active: boolean
  rate_limit_tier: string
  created_at: string
  last_used_at?: string
  token_type?: 'api' | 'oauth'
  expires_at?: string
  full_token?: string
}

// PERFORMANCE: Cache for MCP tokens to reduce API calls
const tokensCache = {
  data: null as MCPToken[] | null,
  timestamp: 0,
  CACHE_DURATION: 2 * 60 * 1000 // 2 minutes
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function MCPTokensPage() {
  const { user, loading: authLoading } = useAuth()
  const [tokens, setTokens] = useState<MCPToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    token_name: '',
    token_type: 'api' // 'api' or 'cli' (oauth is automatic)
  })

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchTokens()
    }
  }, [user])

  const fetchTokens = async (forceRefresh = false) => {
    try {
      setLoading(true)

      // Check cache first (unless force refresh)
      const now = Date.now()
      if (!forceRefresh &&
          tokensCache.data &&
          (now - tokensCache.timestamp) < tokensCache.CACHE_DURATION) {
        setTokens(tokensCache.data)
        setLoading(false)
        return
      }

      const response = await fetch('/api/mcp/tokens', {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tokens')
      }

      // Filter out OAuth tokens as they can't be used directly by users
      const filteredTokens = (data.tokens || []).filter((token: MCPToken) => token.token_type !== 'oauth')

      // Update cache
      tokensCache.data = filteredTokens
      tokensCache.timestamp = now

      setTokens(filteredTokens)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createToken = async () => {
    if (!formData.token_name.trim()) {
      setError('Token name is required')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/mcp/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token')
      }
      
      setGeneratedApiKey(data.api_key)
      setShowAddForm(false)
      setFormData({ token_name: '', token_type: 'api' })
      await fetchTokens(true) // Force refresh after creating
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTokenActive = async (tokenId: string, active: boolean) => {
    try {
      const response = await fetch('/api/mcp/tokens', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ id: tokenId, active: !active })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update token')
      }

      await fetchTokens(true) // Force refresh after toggling
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this MCP token? This cannot be undone and will break any MCP clients using this token.')) return

    try {
      const response = await fetch(`/api/mcp/tokens?id=${tokenId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete token')
      }

      await fetchTokens(true) // Force refresh after deleting
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = async (text: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedToken(tokenId)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getTokenToCopy = (token: MCPToken) => {
    // For OAuth tokens, return the full token if available, otherwise preview
    if (token.token_type === 'oauth' && token.full_token) {
      return token.full_token
    }
    return token.token_preview
  }

  const getTierBadge = (tier: string) => {
    return 'bg-slate-100 text-slate-900'
  }

  const getRateLimitDescription = (tier: string) => {
    const limits = {
      standard: '100 requests/minute, 10,000/day',
      premium: '500 requests/minute, 50,000/day', 
      enterprise: '2,000 requests/minute, unlimited/day',
      oauth: 'OAuth authenticated - no rate limits'
    }
    return limits[tier as keyof typeof limits] || limits.standard
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="max-w-6xl mx-auto p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="mb-8" variants={itemVariants}>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          MCP API Tokens
        </h1>
        <p className="text-slate-600 mb-6">
          Connect AI coding assistants to Polydev for multi-model perspectives. Get insights from Claude, GPT-4, Gemini, and more in a single request.
        </p>

        {/* Quick Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Zap className="w-4 h-4 text-slate-900" />
              </div>
              <h3 className="font-semibold text-slate-900">Claude Desktop</h3>
            </div>
            <p className="text-xs text-slate-600 mb-2">Best experience with OAuth authentication</p>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate">polydev_*</code>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Terminal className="w-4 h-4 text-slate-900" />
              </div>
              <h3 className="font-semibold text-slate-900">Continue.dev / Cursor</h3>
            </div>
            <p className="text-xs text-slate-600 mb-2">API token for IDE extensions</p>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate">pd_*</code>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Key className="w-4 h-4 text-slate-900" />
              </div>
              <h3 className="font-semibold text-slate-900">NPM Package</h3>
            </div>
            <p className="text-xs text-slate-600 mb-2">For polydev-perspectives-mcp</p>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate">POLYDEV_USER_TOKEN</code>
          </div>
        </div>

        {/* Server URL Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">MCP Server URL</h3>
              <code className="text-sm font-mono text-slate-700">https://www.polydev.ai/api/mcp</code>
            </div>
            <button
              onClick={() => copyToClipboard('https://www.polydev.ai/api/mcp', 'server-url')}
              className="text-slate-600 hover:text-slate-900 p-2"
              title="Copy server URL"
            >
              {copiedToken === 'server-url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded mb-6 flex items-center space-x-2 font-medium">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-slate-600 hover:text-slate-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Generated API Key Modal */}
      {generatedApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center space-x-2 mb-4">
              <Check className="w-6 h-6 text-slate-900" />
              <h2 className="text-xl font-semibold text-slate-900">
                API Token Created Successfully
              </h2>
            </div>
            <p className="text-slate-600 mb-4">
              Your MCP API token has been generated. <strong>Save this token securely</strong> - it won't be shown again.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all mr-4">{generatedApiKey}</code>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, 'generated')}
                  className="flex-shrink-0 text-slate-600 hover:text-slate-900"
                  title="Copy to clipboard"
                >
                  {copiedToken === 'generated' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setGeneratedApiKey(null)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <motion.div
        className="bg-white shadow border border-slate-200 rounded-lg hover:shadow-lg transition-shadow"
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Your MCP Tokens
          </h2>
          <button
            onClick={() => {
              setShowAddForm(true)
              setFormData({ token_name: '', token_type: 'api' })
            }}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Token</span>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-medium text-slate-900 mb-4">
              Create New MCP Token
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Token Type *
                </label>
                <select
                  value={formData.token_type}
                  onChange={(e) => setFormData(prev => ({...prev, token_type: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="api">API Token (pd_) - For published package & MCP clients</option>
                  <option value="cli">CLI Status Token (cli_) - For status reporting</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Token Name *
                </label>
                <input
                  type="text"
                  value={formData.token_name}
                  onChange={(e) => setFormData(prev => ({...prev, token_name: e.target.value}))}
                  placeholder={
                    formData.token_type === 'api' ? 'e.g., Continue Extension, API Access' :
                    formData.token_type === 'cli' ? 'e.g., CLI Status Reporter' :
                    'e.g., Token Name'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-md p-3">
                <div className="text-sm text-slate-600">
                  <strong>Rate Limit Tier:</strong> Automatically set based on your subscription plan
                </div>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded p-3 mb-4">
              <p className="text-sm text-slate-900">
                <strong>Note:</strong> OAuth tokens (polydev_) are automatically generated when you authenticate with Claude Desktop.
                Only create manual tokens if you need them for the published package or other MCP clients.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={createToken}
                disabled={!formData.token_name.trim()}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Generate Token</span>
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-600 px-4 py-2 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tokens Table */}
        <div className="overflow-x-auto">
          {tokens.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-600">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-slate-900" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-slate-900">No MCP tokens yet</h3>
              <p className="text-sm">Create your first MCP token to start using Polydev with MCP clients</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {tokens.map((token) => (
                <div key={token.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {token.token_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {token.token_name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-slate-500 font-mono">
                              {token.token_preview}
                            </p>
                            <button
                              onClick={() => copyToClipboard(getTokenToCopy(token), token.id)}
                              className="text-slate-500 hover:text-slate-900"
                              title={token.token_type === 'oauth' ? 'Copy full OAuth token' : 'Copy token preview'}
                            >
                              {copiedToken === token.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-900">
                            {token.active ? 'Active' : 'Disabled'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadge(token.rate_limit_tier)}`}>
                            {token.rate_limit_tier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-slate-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created {new Date(token.created_at).toLocaleDateString()}</span>
                        </span>
                        {token.last_used_at && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Last used {new Date(token.last_used_at).toLocaleDateString()}</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {getRateLimitDescription(token.rate_limit_tier)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {token.token_type === 'oauth' ? (
                        <div className="text-xs text-slate-600 px-3 py-2">
                          OAuth managed
                          {token.expires_at && (
                            <div>Expires: {new Date(token.expires_at).toLocaleDateString()}</div>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleTokenActive(token.id, token.active)}
                            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            title={token.active ? 'Disable token' : 'Enable token'}
                          >
                            {token.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteToken(token.id)}
                            className="text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100"
                            title="Delete token"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Setup Instructions - Tabbed */}
      <motion.div
        className="mt-8 bg-white rounded-lg border border-slate-200 hover:shadow-lg transition-shadow overflow-hidden"
        variants={itemVariants}
      >
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
            <Terminal className="w-5 h-5" />
            <span>Setup Instructions</span>
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Claude Desktop */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-slate-700" />
                <h4 className="font-medium text-slate-900">Claude Desktop</h4>
                <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded">Recommended</span>
              </div>
              <a href="https://docs.polydev.ai/setup/claude-desktop" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1">
                <span>Full guide</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">Add to your <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">claude_desktop_config.json</code>:</p>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": { "type": "http", "url": "https://www.polydev.ai/api/mcp" },
        "auth": { "type": "oauth", "provider": "polydev" }
      }
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* Continue.dev / Cursor */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-700" />
                <h4 className="font-medium text-slate-900">Continue.dev / Cursor / Other IDEs</h4>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">Use a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">pd_*</code> API token with bearer auth:</p>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": { "type": "http", "url": "https://www.polydev.ai/api/mcp" },
        "auth": { "type": "bearer", "token": "pd_your_token_here" }
      }
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* NPM Package */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-slate-700" />
                <h4 className="font-medium text-slate-900">NPM Package (polydev-perspectives-mcp)</h4>
              </div>
              <a href="https://www.npmjs.com/package/polydev-perspectives-mcp" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1">
                <span>npm</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="p-4">
              <pre className="bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto">
{`npm install -g polydev-perspectives-mcp

# Set your token as an environment variable
export POLYDEV_USER_TOKEN="pd_your_token_here"`}
              </pre>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}