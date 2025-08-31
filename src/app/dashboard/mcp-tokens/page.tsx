'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '../../utils/supabase/client'
import { Plus, Eye, EyeOff, Copy, Trash2, Settings, Key, AlertCircle, Check, Clock, Zap } from 'lucide-react'

interface MCPToken {
  id: string
  token_name: string
  token_preview: string
  active: boolean
  rate_limit_tier: string
  created_at: string
  last_used_at?: string
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
    rate_limit_tier: 'standard'
  })

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchTokens()
    }
  }, [user])

  const fetchTokens = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/mcp/tokens', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tokens')
      }
      
      setTokens(data.tokens || [])
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
      setFormData({ token_name: '', rate_limit_tier: 'standard' })
      await fetchTokens()
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
      
      await fetchTokens()
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
      
      await fetchTokens()
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

  const getTierBadge = (tier: string) => {
    const styles = {
      standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      enterprise: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
    return styles[tier as keyof typeof styles] || styles.standard
  }

  const getRateLimitDescription = (tier: string) => {
    const limits = {
      standard: '100 requests/minute, 10,000/day',
      premium: '500 requests/minute, 50,000/day', 
      enterprise: '2,000 requests/minute, unlimited/day'
    }
    return limits[tier as keyof typeof limits] || limits.standard
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          MCP API Tokens
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Generate API tokens to authenticate with Polydev's hosted MCP server. Use OAuth for the best experience or API tokens for programmatic access.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Hosted MCP Server</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Connect your MCP clients to Polydev's hosted server for breakthrough insights from multiple AI models. Supports both OAuth and API token authentication.
              </p>
              <div className="bg-blue-100 dark:bg-blue-800 rounded px-3 py-2 font-mono text-sm">
                <strong>Server URL:</strong> https://polydev.ai/api/mcp
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Generated API Key Modal */}
      {generatedApiKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center space-x-2 mb-4">
              <Check className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                API Token Created Successfully
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your MCP API token has been generated. <strong>Save this token securely</strong> - it won't be shown again.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all mr-4">{generatedApiKey}</code>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, 'generated')}
                  className="flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  title="Copy to clipboard"
                >
                  {copiedToken === 'generated' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setGeneratedApiKey(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your MCP Tokens
          </h2>
          <button
            onClick={() => {
              setShowAddForm(true)
              setFormData({ token_name: '', rate_limit_tier: 'standard' })
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Token</span>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Create New MCP Token
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token Name *
                </label>
                <input
                  type="text"
                  value={formData.token_name}
                  onChange={(e) => setFormData(prev => ({...prev, token_name: e.target.value}))}
                  placeholder="e.g., Claude Desktop, Continue Extension"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rate Limit Tier
                </label>
                <select
                  value={formData.rate_limit_tier}
                  onChange={(e) => setFormData(prev => ({...prev, rate_limit_tier: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="standard">Standard - {getRateLimitDescription('standard')}</option>
                  <option value="premium">Premium - {getRateLimitDescription('premium')}</option>
                  <option value="enterprise">Enterprise - {getRateLimitDescription('enterprise')}</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={createToken}
                disabled={!formData.token_name.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Generate Token</span>
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tokens Table */}
        <div className="overflow-x-auto">
          {tokens.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">No MCP tokens yet</h3>
              <p className="text-sm">Create your first MCP token to start using Polydev with MCP clients</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tokens.map((token) => (
                <div key={token.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {token.token_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {token.token_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {token.token_preview}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            token.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {token.active ? 'Active' : 'Disabled'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadge(token.rate_limit_tier)}`}>
                            <Zap className="w-3 h-3 inline mr-1" />
                            {token.rate_limit_tier}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created {new Date(token.created_at).toLocaleDateString()}</span>
                        </span>
                        {token.last_used_at && (
                          <span className="flex items-center space-x-1">
                            <Settings className="w-4 h-4" />
                            <span>Last used {new Date(token.last_used_at).toLocaleDateString()}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {getRateLimitDescription(token.rate_limit_tier)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleTokenActive(token.id, token.active)}
                        className={`p-2 rounded-lg ${
                          token.active 
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                        }`}
                        title={token.active ? 'Disable token' : 'Enable token'}
                      >
                        {token.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteToken(token.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete token"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>How to Use MCP Tokens</span>
        </h3>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Claude Desktop (OAuth - Recommended)</h4>
            <p>Connect using OAuth for the best experience:</p>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "oauth",
          "provider": "polydev"
        }
      }
    }
  }
}`}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Continue.dev (API Token)</h4>
            <p>Use API token authentication for programmatic access:</p>
            <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2 text-xs overflow-x-auto">
{`{
  "experimental": {
    "modelContextProtocol": true
  },
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer",
          "token": "pd_your_token_here"
        }
      }
    }
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}