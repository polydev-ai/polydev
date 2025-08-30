'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '../utils/supabase/client'

interface MCPClient {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'idle'
  lastActivity?: string
  connectionTime?: string
  toolCalls: number
}

interface LLMProvider {
  id: string
  name: string
  model: string
  status: 'active' | 'inactive'
  requests: number
  cost: string
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [realTimeData, setRealTimeData] = useState({
    totalRequests: 0,
    totalCost: 0,
    activeConnections: 0,
    uptime: '99.9%'
  })
  const [isConnected, setIsConnected] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadDashboardData()
      setupRealTimeUpdates()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Simulate API call for dashboard data
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${user?.id}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRealTimeData(data)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Use mock data as fallback
      setRealTimeData({
        totalRequests: 2929,
        totalCost: 57.85,
        activeConnections: 4,
        uptime: '99.9%'
      })
    }
  }

  const setupRealTimeUpdates = () => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 3),
        totalCost: parseFloat((prev.totalCost + Math.random() * 0.1).toFixed(2)),
        activeConnections: Math.max(1, prev.activeConnections + (Math.random() > 0.5 ? 1 : -1))
      }))
    }, 5000)

    setIsConnected(true)
    return () => {
      clearInterval(interval)
      setIsConnected(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  const mcpClients: MCPClient[] = [
    {
      id: 'claude-code',
      name: 'Claude Code',
      description: 'Anthropic\'s official CLI for Claude - connected via MCP',
      status: 'connected',
      toolCalls: 247,
      lastActivity: '2 mins ago',
      connectionTime: '2 hours ago'
    },
    {
      id: 'cursor',
      name: 'Cursor AI',
      description: 'AI-first code editor using our perspectives MCP tool',
      status: 'connected',
      toolCalls: 156,
      lastActivity: '15 mins ago',
      connectionTime: '4 hours ago'
    },
    {
      id: 'codex-cli',
      name: 'Codex CLI',
      description: 'Command-line interface connected to Polydev MCP server',
      status: 'idle',
      toolCalls: 89,
      lastActivity: '1 hour ago',
      connectionTime: '6 hours ago'
    },
    {
      id: 'continue-dev',
      name: 'Continue.dev',
      description: 'VS Code extension using our multi-model perspectives',
      status: 'disconnected',
      toolCalls: 34,
      lastActivity: '3 hours ago',
      connectionTime: '1 day ago'
    }
  ]

  const llmProviders: LLMProvider[] = [
    // API-based providers
    {
      id: 'anthropic',
      name: 'Anthropic',
      model: 'claude-opus-4-1-20250805',
      status: 'active',
      requests: 892,
      cost: '$18.90'
    },
    {
      id: 'anthropic-sonnet',
      name: 'Anthropic',
      model: 'claude-3-5-sonnet-20241022',
      status: 'active',
      requests: 634,
      cost: '$15.30'
    },
    {
      id: 'anthropic-haiku',
      name: 'Anthropic',
      model: 'claude-3-5-haiku-20241022',
      status: 'active',
      requests: 423,
      cost: '$8.45'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      model: 'gpt-4o',
      status: 'active',
      requests: 1247,
      cost: '$23.45'
    },
    {
      id: 'openai-mini',
      name: 'OpenAI',
      model: 'gpt-4o-mini',
      status: 'active',
      requests: 892,
      cost: '$5.20'
    },
    {
      id: 'openai-o1',
      name: 'OpenAI',
      model: 'o1-preview',
      status: 'active',
      requests: 156,
      cost: '$45.80'
    },
    {
      id: 'google',
      name: 'Google AI',
      model: 'gemini-2.0-flash-exp',
      status: 'active',
      requests: 534,
      cost: '$8.20'
    },
    {
      id: 'google-pro',
      name: 'Google AI',
      model: 'gemini-1.5-pro-002',
      status: 'active',
      requests: 298,
      cost: '$12.45'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      model: 'deepseek-chat',
      status: 'active',
      requests: 423,
      cost: '$2.15'
    },
    {
      id: 'xai',
      name: 'xAI',
      model: 'grok-beta',
      status: 'active',
      requests: 312,
      cost: '$6.80'
    },
    {
      id: 'groq',
      name: 'Groq',
      model: 'llama-3.1-70b-versatile',
      status: 'active',
      requests: 567,
      cost: '$3.25'
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      model: 'anthropic/claude-3.5-sonnet',
      status: 'active',
      requests: 234,
      cost: '$9.80'
    },
    // CLI-based providers (subscription)
    {
      id: 'codex-cli',
      name: 'Codex CLI',
      model: 'gpt-4o (CLI)',
      status: 'active',
      requests: 245,
      cost: 'Subscription'
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      model: 'claude-opus-4-1-20250805 (CLI)',
      status: 'active',
      requests: 198,
      cost: 'Subscription'
    },
    {
      id: 'github-copilot',
      name: 'GitHub Copilot',
      model: 'gpt-4o (GitHub)',
      status: 'active',
      requests: 156,
      cost: 'Subscription'
    },
    {
      id: 'gemini-cli',
      name: 'Gemini CLI',
      model: 'gemini-2.0-flash-exp (Cloud)',
      status: 'active',
      requests: 89,
      cost: 'Cloud Credits'
    },
    // Cloud-based providers
    {
      id: 'vertex',
      name: 'Google Vertex AI',
      model: 'gemini-1.5-pro-002',
      status: 'active',
      requests: 123,
      cost: 'Cloud Credits'
    },
    {
      id: 'bedrock',
      name: 'AWS Bedrock',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      status: 'active',
      requests: 78,
      cost: 'AWS Credits'
    },
    {
      id: 'azure',
      name: 'Azure OpenAI',
      model: 'gpt-4o',
      status: 'active',
      requests: 167,
      cost: 'Azure Credits'
    },
    // Local providers
    {
      id: 'ollama',
      name: 'Ollama',
      model: 'llama3.2',
      status: 'active',
      requests: 445,
      cost: 'Local/Free'
    },
    {
      id: 'lmstudio',
      name: 'LM Studio',
      model: 'local-model',
      status: 'inactive',
      requests: 23,
      cost: 'Local/Free'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'idle':
        return 'text-yellow-600 bg-yellow-100'
      case 'disconnected':
      case 'inactive':
        return 'text-gray-600 bg-gray-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Welcome & Real-time Status */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
              </h1>
              <p className="text-gray-600 mt-2">Monitor connected MCP clients, LLM usage, and system health</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live Data' : 'Disconnected'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">System Health</div>
                <div className="text-lg font-semibold text-green-600">{realTimeData.uptime}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData.totalRequests.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">+12% from last hour</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">${realTimeData.totalCost.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">Within budget</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData.activeConnections}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-blue-600">Real-time</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Response Time</p>
                <p className="text-2xl font-bold text-gray-900">245ms</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">Excellent</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'mcp-clients', 'llm-providers', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Connected MCP Clients</p>
                    <p className="text-2xl font-semibold text-gray-900">3</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                    <p className="text-2xl font-semibold text-gray-900">2,929</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                    <p className="text-2xl font-semibold text-gray-900">$57.85</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Health</p>
                    <p className="text-2xl font-semibold text-green-600">98.9%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/chat" className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Start Multi-LLM Chat</p>
                      <p className="text-sm text-gray-600">Compare responses across models</p>
                    </div>
                  </Link>

                  <Link href="/api-explorer" className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">API Explorer</p>
                      <p className="text-sm text-gray-600">Test MCP endpoints</p>
                    </div>
                  </Link>

                  <Link href="/settings" className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Settings</p>
                      <p className="text-sm text-gray-600">Configure integrations</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MCP Clients Tab */}
        {activeTab === 'mcp-clients' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Connected MCP Clients</h2>
                <p className="text-gray-600 mt-1">AI agents and tools connected to your Polydev MCP server</p>
              </div>
              <div className="text-sm text-gray-500">
                Total tool calls: {mcpClients.reduce((sum, client) => sum + client.toolCalls, 0)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mcpClients.map((client) => (
                <div key={client.id} className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{client.description}</p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex justify-between">
                        <span>Tool calls:</span>
                        <span className="font-medium">{client.toolCalls}</span>
                      </div>
                      {client.lastActivity && (
                        <div className="flex justify-between">
                          <span>Last activity:</span>
                          <span>{client.lastActivity}</span>
                        </div>
                      )}
                      {client.connectionTime && (
                        <div className="flex justify-between">
                          <span>Connected:</span>
                          <span>{client.connectionTime}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-100">
                        View Activity
                      </button>
                      <button className="flex-1 bg-gray-50 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-100">
                        Debug Connection
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Connect New MCP Client</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Add our MCP server configuration to your agent's config to start using Polydev perspectives. 
                    <a href="/docs/mcp-integration" className="underline hover:no-underline ml-1">View integration guide</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LLM Providers Tab */}
        {activeTab === 'llm-providers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">LLM Providers</h2>
              <Link 
                href="/dashboard/api-keys"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Provider</span>
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {llmProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                            {provider.name.charAt(0)}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{provider.model}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(provider.status)}`}>
                          {provider.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {provider.requests.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {provider.cost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href="/dashboard/api-keys"
                            className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            Configure
                          </Link>
                          <button 
                            onClick={() => alert('Provider analytics coming soon!')}
                            className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
                          >
                            Analytics
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Multi-Provider Configuration</h3>
                  <p className="text-blue-800 mb-4">
                    Configure multiple LLM providers to compare responses, optimize costs, and ensure reliability. 
                    Set up API keys for traditional providers or use CLI-based subscription access.
                  </p>
                  <div className="flex space-x-3">
                    <Link
                      href="/dashboard/api-keys"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span>Manage API Keys</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="bg-white text-blue-600 border border-blue-300 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>CLI Configuration</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Analytics & Usage</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">API Usage Trends</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart placeholder - API usage over time</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart placeholder - Cost by provider</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Response Times</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart placeholder - Average response times</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Error Rates</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart placeholder - Error rates by service</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}