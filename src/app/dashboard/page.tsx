'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardData } from '../../hooks/useDashboardData'
import OverviewSection from './components/OverviewSection'
import RequestLogsSection from './components/RequestLogsSection'
import ProviderAnalyticsSection from './components/ProviderAnalyticsSection'
import ModelAnalyticsSection from './components/ModelAnalyticsSection'
import McpClientsSection from './components/McpClientsSection'
import AnalyticsSection from './components/AnalyticsSection'
import { Crown, Star, Leaf } from 'lucide-react'

interface MCPClient {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'idle'
  lastActivity?: string
  connectionTime?: string
  toolCalls: number
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [logsFilter, setLogsFilter] = useState('all')
  const [isConnected, setIsConnected] = useState(false)
  const [quotaData, setQuotaData] = useState<any>(null)

  // Use optimized dashboard data hook
  const {
    stats: realTimeData,
    creditBalance,
    requestLogs,
    providerAnalytics,
    modelAnalytics,
    providersRegistry,
    loading: dataLoading,
    error,
    refresh
  } = useDashboardData()

  // Fetch quota data
  useEffect(() => {
    const fetchQuotaData = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/user/quota', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setQuotaData(data)
        }
      } catch (error) {
        console.error('Failed to fetch quota data:', error)
      }
    }
    fetchQuotaData()
  }, [user])

  // Setup real-time connection indicator
  useEffect(() => {
    if (user) {
      setIsConnected(true)
      // Refresh data every 5 minutes instead of 30 seconds to reduce load
      const interval = setInterval(refresh, 5 * 60 * 1000)
      return () => {
        clearInterval(interval)
        setIsConnected(false)
      }
    }
  }, [user, refresh])

  // Optimized request logs reload based on filter
  const [requestLogsLoading, setRequestLogsLoading] = useState(false)

  const loadRequestLogs = async () => {
    if (!user) return
    setRequestLogsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (logsFilter !== 'all') params.append('status', logsFilter)
      const response = await fetch(`/api/dashboard/request-logs?${params}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        // Note: This would require updating the hook to support filtered logs
        // For now, we'll just refresh all data
        refresh()
      }
    } catch (error) {
      console.warn('Failed to reload request logs:', error)
    } finally {
      setRequestLogsLoading(false)
    }
  }

  // Reload logs when filter changes
  useEffect(() => {
    if (user && activeTab === 'request-logs') {
      loadRequestLogs()
    }
  }, [activeTab, logsFilter])

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
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

  const generateMCPClientsFromTokens = () => {
    const clientMap = new Map<string, MCPClient>()
    if (Array.isArray(realTimeData?.recentActivity)) {
      realTimeData.recentActivity.forEach((activity: any) => {
        if (activity && activity.action === 'Client Connected' && activity.provider) {
          const clientId = activity.provider.toLowerCase().replace(/\s+/g, '-')
          if (!clientMap.has(clientId)) {
            clientMap.set(clientId, {
              id: clientId,
              name: activity.provider,
              description: getClientDescription(activity.provider),
              status: 'connected',
              toolCalls: 0,
              lastActivity: formatTimeAgo(activity.timestamp || new Date().toISOString()),
              connectionTime: formatTimeAgo(activity.timestamp || new Date().toISOString()),
            })
          }
          const client = clientMap.get(clientId)
          if (client) client.toolCalls += 1
        } else if (activity && activity.action === 'API Request') {
          clientMap.forEach((client) => {
            if (client.status === 'connected') client.toolCalls += 1
          })
        }
      })
    }
    if (clientMap.size === 0 && (realTimeData?.activeConnections || 0) > 0) {
      const defaults = [
        { id: 'claude-desktop', name: 'Claude Code', description: 'Official Claude desktop application with MCP integration' },
        { id: 'cursor', name: 'Cursor', description: 'AI-powered code editor with Polydev perspectives integration' },
      ]
      defaults.slice(0, realTimeData?.activeConnections || 0).forEach((c) => {
        clientMap.set(c.id, {
          id: c.id,
          name: c.name,
          description: c.description,
          status: 'connected',
          toolCalls: Math.floor((realTimeData?.totalRequests || 0) / Math.max(realTimeData?.activeConnections || 1, 1)),
          lastActivity: 'recently',
          connectionTime: 'active session',
        })
      })
    }
    return Array.from(clientMap.values())
  }

  const mcpClients: MCPClient[] = generateMCPClientsFromTokens()

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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h1>
              <p className="text-gray-600 mt-2">Monitor connected MCP clients, LLM usage, and system health</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">{isConnected ? 'Live Data' : 'Disconnected'}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">System Health</div>
                <div className="text-lg font-semibold text-green-600">{realTimeData?.uptime || '99.9%'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Path Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">How would you like to use Polydev?</h3>
              <p className="text-sm text-gray-600">Choose your preferred method for accessing AI models</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
              <Link href="/dashboard/models" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2h-6a2 2 0 01-2-2V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7a2 2 0 012-2h2m0 0h2m0 0a2 2 0 012 2v2M7 7V5a2 2 0 012-2m0 4a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2m5 10V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2z"/></svg>
                Use My API Keys
              </Link>
              <Link href="/dashboard/credits" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
                Buy Credits
              </Link>
              <Link href="/dashboard/usage" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z"/></svg>
                View Usage
              </Link>
            </div>
          </div>
        </div>

        {/* Real-time Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Messages Used</p>
                <p className="text-2xl font-bold text-white">{quotaData?.used?.messages || 0} / {quotaData?.limits?.messages || '∞'}</p>
                {quotaData?.allTimeMessages && (
                  <p className="text-xs text-blue-100 mt-1">All-time: {quotaData.allTimeMessages}</p>
                )}
                {(quotaData?.bonusMessages || 0) > 0 && (<p className="text-xs text-blue-100">+{quotaData.bonusMessages} bonus messages</p>)}
              </div>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              </div>
            </div>
            <div className="mt-2">
              <Link href="/dashboard/credits" className="text-sm text-blue-100 hover:text-white underline">View Details →</Link>
            </div>
          </div>

          {/* Premium Perspectives Card */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-purple-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">Premium</p>
              </div>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                {quotaData?.percentages?.premium?.toFixed(0) || 0}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quotaData?.remaining?.premium || 0}</p>
              <p className="text-xs text-gray-500 mt-1">of {quotaData?.limits?.premium || 0} remaining</p>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.premium || 0}%` }}
              />
            </div>
          </div>

          {/* Normal Perspectives Card */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">Normal</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                {quotaData?.percentages?.normal?.toFixed(0) || 0}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quotaData?.remaining?.normal || 0}</p>
              <p className="text-xs text-gray-500 mt-1">of {quotaData?.limits?.normal || 0} remaining</p>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.normal || 0}%` }}
              />
            </div>
          </div>

          {/* Eco Perspectives Card */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-green-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                  <Leaf className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">Eco</p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                {quotaData?.percentages?.eco?.toFixed(0) || 0}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quotaData?.remaining?.eco || 0}</p>
              <p className="text-xs text-gray-500 mt-1">of {quotaData?.limits?.eco || 0} remaining</p>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.eco || 0}%` }}
              />
            </div>
          </div>

          {/* Active Providers Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Providers</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData?.activeProviders || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'request-logs', 'provider-analytics', 'model-analytics', 'mcp-clients', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <OverviewSection userEmail={user?.email ?? null} realTimeData={{
            totalRequests: realTimeData?.totalRequests || 0,
            totalCost: realTimeData?.totalCost || 0,
            activeConnections: realTimeData?.activeConnections || 0,
            uptime: realTimeData?.uptime || '99.9%',
            responseTime: realTimeData?.responseTime || 245,
            totalApiKeys: realTimeData?.totalApiKeys || 0,
          }} />
        )}

        {activeTab === 'request-logs' && (
          <RequestLogsSection
            requestLogs={requestLogs || []}
            requestLogsLoading={requestLogsLoading}
            logsFilter={logsFilter}
            setLogsFilter={setLogsFilter}
            loadRequestLogs={loadRequestLogs}
            selectedLog={selectedLog}
            setSelectedLog={setSelectedLog}
            realTimeData={{ totalApiKeys: realTimeData?.totalApiKeys || 0 }}
          />
        )}

        {activeTab === 'provider-analytics' && (
          <ProviderAnalyticsSection providerAnalytics={providerAnalytics} requestLogs={requestLogs || []} providersRegistry={providersRegistry || []} />
        )}

        {activeTab === 'model-analytics' && (
          <ModelAnalyticsSection modelAnalytics={modelAnalytics} requestLogs={requestLogs || []} providersRegistry={providersRegistry || []} />
        )}

        {activeTab === 'mcp-clients' && (
          <McpClientsSection mcpClients={mcpClients} getStatusColor={getStatusColor} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsSection realTimeData={{
            totalRequests: realTimeData?.totalRequests || 0,
            totalCost: realTimeData?.totalCost || 0,
            responseTime: realTimeData?.responseTime || 245,
          }} providerAnalytics={providerAnalytics} requestLogs={requestLogs || []} />
        )}
      </div>
    </div>
  )
}

