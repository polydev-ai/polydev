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
    uptime: '99.9%',
    responseTime: 245,
    totalApiKeys: 0,
    activeProviders: 0,
    totalMcpTokens: 0,
    providerStats: [],
    recentActivity: []
  })
  const [requestLogs, setRequestLogs] = useState([])
  const [requestLogsLoading, setRequestLogsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [logsFilter, setLogsFilter] = useState('all') // all, success, error
  const [isConnected, setIsConnected] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadDashboardData()
      loadRequestLogs()
      setupRealTimeUpdates()
    }
  }, [user])

  useEffect(() => {
    if (user && activeTab === 'request-logs') {
      loadRequestLogs()
    }
  }, [activeTab, logsFilter])

  const loadDashboardData = async () => {
    try {
      console.log('[Dashboard] Loading real stats for user:', user?.id)
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[Dashboard] Received real stats:', data)
        setRealTimeData({
          totalRequests: data.totalRequests || 0,
          totalCost: data.totalCost || 0,
          activeConnections: data.activeConnections || 0,
          uptime: data.uptime || '99.9%',
          responseTime: data.responseTime || 245,
          totalApiKeys: data.totalApiKeys || 0,
          activeProviders: data.activeProviders || 0,
          totalMcpTokens: data.totalMcpTokens || 0,
          providerStats: data.providerStats || [],
          recentActivity: data.recentActivity || []
        })
      } else {
        console.error('[Dashboard] Stats API error:', response.status, response.statusText)
        throw new Error(`API returned ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Use basic fallback data
      setRealTimeData({
        totalRequests: 0,
        totalCost: 0.00,
        activeConnections: 0,
        uptime: '99.9%',
        responseTime: 245,
        totalApiKeys: 0,
        activeProviders: 0,
        totalMcpTokens: 0,
        providerStats: [],
        recentActivity: []
      })
    }
  }

  const loadRequestLogs = async () => {
    if (!user) return
    
    setRequestLogsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      })
      
      if (logsFilter !== 'all') {
        params.append('status', logsFilter)
      }
      
      const response = await fetch(`/api/dashboard/request-logs?${params}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setRequestLogs(data.logs || [])
      } else {
        console.error('[Dashboard] Request logs API error:', response.status)
        setRequestLogs([])
      }
    } catch (error) {
      console.error('Error loading request logs:', error)
      setRequestLogs([])
    } finally {
      setRequestLogsLoading(false)
    }
  }

  const setupRealTimeUpdates = () => {
    // Refresh real data periodically instead of simulating random updates
    const interval = setInterval(() => {
      loadDashboardData() // Fetch real data every 30 seconds
    }, 30000)

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
  
  // Generate MCP clients from recent activity data
  const generateMCPClientsFromActivity = () => {
    const clientMap = new Map()
    
    // Process recent activity to determine connected clients
    if (realTimeData.recentActivity && Array.isArray(realTimeData.recentActivity)) {
      realTimeData.recentActivity.forEach((activity: any) => {
        if (activity && activity.provider) {
          const clientId = activity.provider.toLowerCase().replace(/\s+/g, '-')
          
          if (!clientMap.has(clientId)) {
            clientMap.set(clientId, {
              id: clientId,
              name: activity.provider,
              description: getClientDescription(activity.provider),
              status: 'connected',
              toolCalls: 0,
              lastActivity: formatTimeAgo(activity.timestamp || new Date().toISOString()),
              connectionTime: formatTimeAgo(activity.timestamp || new Date().toISOString())
            })
          }
          
          const client = clientMap.get(clientId)
          if (client) {
            client.toolCalls += 1
            
            // Update last activity if more recent
            const activityTime = activity.timestamp || new Date().toISOString()
            if (new Date(activityTime) > new Date(client.lastActivity)) {
              client.lastActivity = formatTimeAgo(activityTime)
            }
          }
        }
      })
    }
    
    return Array.from(clientMap.values())
  }

  const getClientDescription = (clientName: string) => {
    switch (clientName) {
      case 'Claude Code':
        return 'Official Claude desktop application with MCP integration'
      case 'Cursor':
        return 'AI-powered code editor with Polydev perspectives integration'
      case 'Unknown Client':
        return 'Custom client connected via MCP protocol'
      default:
        return `${clientName} connected via MCP protocol`
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} mins ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  const mcpClients: MCPClient[] = generateMCPClientsFromActivity()


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
                <p className="text-2xl font-bold text-gray-900">{realTimeData.responseTime}ms</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">
                {realTimeData.responseTime < 300 ? 'Excellent' : realTimeData.responseTime < 500 ? 'Good' : 'Slow'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'request-logs', 'mcp-clients', 'llm-providers', 'analytics'].map((tab) => (
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
                    <p className="text-2xl font-semibold text-gray-900">{realTimeData.activeConnections}</p>
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
                    <p className="text-2xl font-semibold text-gray-900">{realTimeData.totalRequests.toLocaleString()}</p>
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
                    <p className="text-2xl font-semibold text-gray-900">${realTimeData.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">API Keys Configured</p>
                    <p className="text-2xl font-semibold text-gray-900">{realTimeData.totalApiKeys}</p>
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

        {/* Request Logs Tab */}
        {activeTab === 'request-logs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Request Logs</h2>
                <p className="text-gray-600 mt-1">Detailed history of all API requests with prompts, responses, and provider breakdowns</p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Filter Dropdown */}
                <select
                  value={logsFilter}
                  onChange={(e) => setLogsFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Requests</option>
                  <option value="success">Successful Only</option>
                  <option value="error">Errors Only</option>
                  <option value="partial_success">Partial Success</option>
                </select>
                
                {/* Refresh Button */}
                <button
                  onClick={loadRequestLogs}
                  disabled={requestLogsLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
                >
                  <svg className={`w-4 h-4 ${requestLogsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{requestLogsLoading ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Request Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {requestLogsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading request logs...</p>
                </div>
              ) : requestLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prompt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Models
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tokens
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Speed
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requestLogs.map((log: any, index: number) => (
                        <tr key={log.id || index} className="hover:bg-gray-50 cursor-pointer transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                            <div className="text-sm text-gray-900 truncate" title={log.fullPrompt}>
                              {log.prompt || 'No prompt available'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-wrap gap-1">
                              {log.providers && log.providers.length > 0 ? (
                                log.providers.slice(0, 2).map((provider: any, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {provider.model || provider.provider}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                              {log.providers && log.providers.length > 2 && (
                                <span className="text-xs text-gray-500">+{log.providers.length - 2} more</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'success' ? 'bg-green-100 text-green-800' :
                              log.status === 'error' ? 'bg-red-100 text-red-800' :
                              log.status === 'partial_success' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.totalTokens ? log.totalTokens.toLocaleString() : '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${log.cost ? log.cost.toFixed(4) : '0.0000'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.speed || '0'} tok/s
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-2">No request logs found</p>
                  <p className="text-sm text-gray-500">Make some API requests to see detailed logs here.</p>
                </div>
              )}
            </div>

            {/* Usage Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Requests</p>
                    <p className="text-lg font-semibold text-gray-900">{requestLogs.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${requestLogs.reduce((sum: number, log: any) => sum + (log.cost || 0), 0).toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {requestLogs.reduce((sum: number, log: any) => sum + (log.totalTokens || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Response</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {requestLogs.length > 0 
                        ? Math.round(requestLogs.reduce((sum: number, log: any) => sum + (log.responseTime || 0), 0) / requestLogs.length)
                        : 0}ms
                    </p>
                  </div>
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
                  {realTimeData.providerStats && Array.isArray(realTimeData.providerStats) ? 
                    realTimeData.providerStats.map((provider: any, index: number) => (
                      <tr key={`${provider.name || 'provider'}-${index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                              {provider.name ? provider.name.charAt(0) : 'P'}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{provider.name || 'Unknown Provider'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Multiple Models Available</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(provider.status || 'inactive')}`}>
                            {provider.status || 'inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {provider.requests ? provider.requests.toLocaleString() : '0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {provider.cost || '$0.00'}
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
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          No provider configurations found. Add API keys to see your providers here.
                        </td>
                      </tr>
                    )
                  }
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

        {/* Request Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Request Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Request Overview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Request Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Timestamp</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date((selectedLog as any).timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`text-sm font-medium ${
                        (selectedLog as any).status === 'success' ? 'text-green-600' :
                        (selectedLog as any).status === 'error' ? 'text-red-600' :
                        (selectedLog as any).status === 'partial_success' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {(selectedLog as any).status || 'unknown'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Tokens</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).totalTokens ? (selectedLog as any).totalTokens.toLocaleString() : '0'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Total Cost</p>
                      <p className="text-sm font-medium text-gray-900">
                        ${(selectedLog as any).cost ? (selectedLog as any).cost.toFixed(4) : '0.0000'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Prompt */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Full Prompt</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {(selectedLog as any).fullPrompt || 'No prompt available'}
                    </pre>
                  </div>
                </div>

                {/* Provider Breakdown */}
                {(selectedLog as any).providers && (selectedLog as any).providers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Provider Breakdown</h4>
                    <div className="space-y-4">
                      {(selectedLog as any).providers.map((provider: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">
                                  {provider.provider ? provider.provider.charAt(0) : 'P'}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {provider.provider || 'Unknown Provider'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {provider.model || 'Unknown Model'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                ${provider.cost ? provider.cost.toFixed(4) : '0.0000'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {provider.latency || 0}ms
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Tokens Used</p>
                              <p className="font-medium">{provider.tokens || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Success</p>
                              <p className="font-medium">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  provider.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {provider.success ? 'Yes' : 'No'}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Latency</p>
                              <p className="font-medium">{provider.latency || 0}ms</p>
                            </div>
                          </div>

                          {/* Provider Response */}
                          {provider.response && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 mb-2">Response</p>
                              <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono">
                                  {typeof provider.response === 'string' 
                                    ? provider.response 
                                    : JSON.stringify(provider.response, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request Metadata */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Request Metadata</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Client</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).client || 'Unknown'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Temperature</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).temperature || 'Default'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Max Tokens</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).maxTokens || 'Default'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Response Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).responseTime || 0}ms
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Successful Providers</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).successfulProviders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Failed Providers</p>
                      <p className="text-sm font-medium text-gray-900">
                        {(selectedLog as any).failedProviders || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}