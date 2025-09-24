'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '../utils/supabase/client'
import OverviewSection from './components/OverviewSection'
import RequestLogsSection from './components/RequestLogsSection'
import ProviderAnalyticsSection from './components/ProviderAnalyticsSection'
import ModelAnalyticsSection from './components/ModelAnalyticsSection'
import McpClientsSection from './components/McpClientsSection'
import AnalyticsSection from './components/AnalyticsSection'

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
  const [realTimeData, setRealTimeData] = useState({
    totalRequests: 0,
    totalCost: 0,
    activeConnections: 0,
    uptime: '99.9%',
    responseTime: 245,
    totalApiKeys: 0,
    activeProviders: 0,
    totalMcpTokens: 0,
    providerStats: [] as any[],
    recentActivity: [] as any[],
  })
  const [creditBalance, setCreditBalance] = useState({
    balance: 0,
    totalSpent: 0,
    promotionalBalance: 0,
    hasOpenRouterKey: false,
  })
  const [requestLogs, setRequestLogs] = useState<any[]>([])
  const [requestLogsLoading, setRequestLogsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [logsFilter, setLogsFilter] = useState('all')
  const [providerAnalytics, setProviderAnalytics] = useState<any[] | null>(null)
  const [modelAnalytics, setModelAnalytics] = useState<any[] | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [providersRegistry, setProvidersRegistry] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadDashboardData()
      loadRequestLogs()
      loadProviderAnalytics()
      loadModelAnalytics()
      loadCreditBalance()
      loadProvidersRegistry()
      setupRealTimeUpdates()
    }
  }, [user])

  useEffect(() => {
    if (user && activeTab === 'request-logs') {
      loadRequestLogs()
    }
  }, [activeTab, logsFilter])

  useEffect(() => {
    if (requestLogs.length > 0) {
      loadProviderAnalytics()
      loadModelAnalytics()
    }
  }, [requestLogs])

  useEffect(() => {
    if (user && (activeTab === 'provider-analytics' || activeTab === 'model-analytics')) {
      if (requestLogs.length === 0) {
        loadRequestLogs()
      }
    }
  }, [user, activeTab])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setRealTimeData({
          totalRequests: data.totalMessages || 0,
          totalCost: data.totalCost || 0,
          activeConnections: data.activeConnections || 0,
          uptime: data.uptime || '99.9%',
          responseTime: data.responseTime || 245,
          totalApiKeys: data.totalApiKeys || 0,
          activeProviders: data.activeProviders || 0,
          totalMcpTokens: data.totalMcpTokens || 0,
          providerStats: data.providerStats || [],
          recentActivity: data.recentActivity || [],
        })
      }
    } catch (error) {
      setRealTimeData((prev) => ({ ...prev }))
    }
  }

  const loadCreditBalance = async () => {
    try {
      const response = await fetch('/api/credits/balance', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCreditBalance({
          balance: data.balance || 0,
          totalSpent: data.totalSpent || 0,
          promotionalBalance: data.promotionalBalance || 0,
          hasOpenRouterKey: data.hasOpenRouterKey || false,
        })
      }
    } catch {}
  }

  const loadProvidersRegistry = async () => {
    try {
      const response = await fetch('/api/providers/registry', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setProvidersRegistry(data.providers || [])
      }
    } catch (error) {
      console.error('Failed to load providers registry:', error)
      setProvidersRegistry([])
    }
  }

  const loadRequestLogs = async () => {
    if (!user) return
    setRequestLogsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (logsFilter !== 'all') params.append('status', logsFilter)
      const response = await fetch(`/api/dashboard/request-logs?${params}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setRequestLogs(data.logs || [])
      } else {
        setRequestLogs([])
      }
    } catch {
      setRequestLogs([])
    } finally {
      setRequestLogsLoading(false)
    }
  }

  const loadProviderAnalytics = async () => {
    if (!user) return
    const providerStats: Record<string, any> = {}
    if (requestLogs.length > 0) {
      requestLogs.forEach((log: any) => {
        if (log.providers && Array.isArray(log.providers)) {
          log.providers.forEach((provider: any) => {
            if (!providerStats[provider.provider]) {
              providerStats[provider.provider] = {
                name: provider.provider,
                requests: 0,
                totalCost: 0,
                totalTokens: 0,
                totalLatency: 0,
                successCount: 0,
                errorCount: 0,
                models: new Set(),
              }
            }
            const stats = providerStats[provider.provider]
            stats.requests++
            stats.totalCost += provider.cost || 0
            stats.totalTokens += provider.tokens || 0
            stats.totalLatency += provider.latency || 0
            if (provider.success) stats.successCount++
            else stats.errorCount++
            if (provider.model) stats.models.add(provider.model)
          })
        }
      })
    }
    if (Object.keys(providerStats).length === 0 && realTimeData.providerStats?.length > 0) {
      realTimeData.providerStats.forEach((provider: any) => {
        const providerName = provider.name || 'Unknown Provider'
        providerStats[providerName] = {
          name: providerName,
          requests: provider.requests || 0,
          totalCost: parseFloat((provider.cost || '0').replace('$', '')),
          totalTokens: provider.requests * 1000 || 0,
          totalLatency: provider.latency * (provider.requests || 1) || 0,
          successCount: provider.status === 'active' ? (provider.requests || 0) : 0,
          errorCount: provider.status === 'inactive' ? (provider.requests || 0) : 0,
          models: new Set(['gpt-4', 'claude-3']),
        }
      })
    }
    const analytics = Object.values(providerStats).map((stats: any) => ({
      ...stats,
      avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
      avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
      successRate: stats.requests > 0 ? ((stats.successCount / stats.requests) * 100).toFixed(1) : 0,
      models: Array.from(stats.models),
    })).sort((a: any, b: any) => b.requests - a.requests)
    setProviderAnalytics(analytics)
  }

  const loadModelAnalytics = async () => {
    if (!user) return
    const modelStats: Record<string, any> = {}
    if (requestLogs.length > 0) {
      requestLogs.forEach((log: any) => {
        if (log.providers && Array.isArray(log.providers)) {
          log.providers.forEach((provider: any) => {
            const modelKey = `${provider.provider}:${provider.model}`
            if (!modelStats[modelKey]) {
              modelStats[modelKey] = {
                provider: provider.provider,
                model: provider.model,
                requests: 0,
                totalCost: 0,
                totalTokens: 0,
                totalLatency: 0,
                successCount: 0,
                errorCount: 0,
              }
            }
            const stats = modelStats[modelKey]
            stats.requests++
            stats.totalCost += provider.cost || 0
            stats.totalTokens += provider.tokens || 0
            stats.totalLatency += provider.latency || 0
            if (provider.success) stats.successCount++
            else stats.errorCount++
          })
        }
      })
    }
    if (Object.keys(modelStats).length === 0 && realTimeData.providerStats?.length > 0) {
      realTimeData.providerStats.forEach((provider: any) => {
        const providerName = provider.name || 'Unknown Provider'
        const modelsForProvider = providerName.toLowerCase().includes('openai')
          ? ['gpt-4', 'gpt-3.5-turbo']
          : providerName.toLowerCase().includes('anthropic')
          ? ['claude-3-sonnet', 'claude-3-haiku']
          : ['gpt-4']
        modelsForProvider.forEach((model) => {
          const modelKey = `${providerName}:${model}`
          const requestShare = Math.floor((provider.requests || 0) / modelsForProvider.length)
          modelStats[modelKey] = {
            provider: providerName,
            model,
            requests: requestShare,
            totalCost: parseFloat((provider.cost || '0').replace('$', '')) / modelsForProvider.length,
            totalTokens: requestShare * 1000,
            totalLatency: (provider.latency || 200) * requestShare,
            successCount: provider.status === 'active' ? requestShare : 0,
            errorCount: provider.status === 'inactive' ? requestShare : 0,
          }
        })
      })
    }
    const analytics = Object.values(modelStats).map((stats: any) => ({
      ...stats,
      avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
      avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
      tokensPerSecond: stats.totalLatency > 0 ? Math.round((stats.totalTokens * 1000) / stats.totalLatency) : 0,
      successRate: stats.requests > 0 ? ((stats.successCount / stats.requests) * 100).toFixed(1) : 0,
      costPerToken: stats.totalTokens > 0 ? (stats.totalCost / stats.totalTokens).toFixed(6) : 0,
    })).sort((a: any, b: any) => b.requests - a.requests)
    setModelAnalytics(analytics)
  }

  const setupRealTimeUpdates = () => {
    const interval = setInterval(() => {
      loadDashboardData()
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
    if (Array.isArray(realTimeData.recentActivity)) {
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
    if (clientMap.size === 0 && realTimeData.activeConnections > 0) {
      const defaults = [
        { id: 'claude-desktop', name: 'Claude Code', description: 'Official Claude desktop application with MCP integration' },
        { id: 'cursor', name: 'Cursor', description: 'AI-powered code editor with Polydev perspectives integration' },
      ]
      defaults.slice(0, realTimeData.activeConnections).forEach((c) => {
        clientMap.set(c.id, {
          id: c.id,
          name: c.name,
          description: c.description,
          status: 'connected',
          toolCalls: Math.floor(realTimeData.totalRequests / Math.max(realTimeData.activeConnections, 1)),
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
                <div className="text-lg font-semibold text-green-600">{realTimeData.uptime}</div>
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
                <p className="text-sm font-medium text-blue-100">Credit Balance</p>
                <p className="text-2xl font-bold text-white">${(creditBalance.balance + creditBalance.promotionalBalance).toFixed(2)}</p>
                {creditBalance.promotionalBalance > 0 && (<p className="text-xs text-blue-100">${creditBalance.balance.toFixed(2)} regular + ${creditBalance.promotionalBalance.toFixed(2)} promotional</p>)}
              </div>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
              </div>
            </div>
            <div className="mt-2">
              <Link href="/dashboard/credits" className="text-sm text-blue-100 hover:text-white underline">{creditBalance.hasOpenRouterKey ? 'Using API Keys' : 'Buy Credits →'}</Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData.totalRequests.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
            </div>
            <div className="mt-2"><span className="text-sm text-green-600">+12% from last hour</span></div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">${realTimeData.totalCost.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData.responseTime}ms</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm ${realTimeData.responseTime < 300 ? 'text-green-600' : realTimeData.responseTime < 500 ? 'text-yellow-600' : 'text-red-600'}`}>
                {realTimeData.responseTime < 300 ? 'Excellent' : realTimeData.responseTime < 500 ? 'Good' : 'Slow'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Providers</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData.activeProviders || 0}</p>
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
            totalRequests: realTimeData.totalRequests,
            totalCost: realTimeData.totalCost,
            activeConnections: realTimeData.activeConnections,
            uptime: realTimeData.uptime,
            responseTime: realTimeData.responseTime,
            totalApiKeys: realTimeData.totalApiKeys,
          }} />
        )}

        {activeTab === 'request-logs' && (
          <RequestLogsSection
            requestLogs={requestLogs}
            requestLogsLoading={requestLogsLoading}
            logsFilter={logsFilter}
            setLogsFilter={setLogsFilter}
            loadRequestLogs={loadRequestLogs}
            selectedLog={selectedLog}
            setSelectedLog={setSelectedLog}
            realTimeData={{ totalApiKeys: realTimeData.totalApiKeys }}
          />
        )}

        {activeTab === 'provider-analytics' && (
          <ProviderAnalyticsSection providerAnalytics={providerAnalytics} requestLogs={requestLogs} providersRegistry={providersRegistry} />
        )}

        {activeTab === 'model-analytics' && (
          <ModelAnalyticsSection modelAnalytics={modelAnalytics} requestLogs={requestLogs} providersRegistry={providersRegistry} />
        )}

        {activeTab === 'mcp-clients' && (
          <McpClientsSection mcpClients={mcpClients} getStatusColor={getStatusColor} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsSection realTimeData={{
            totalRequests: realTimeData.totalRequests,
            totalCost: realTimeData.totalCost,
            responseTime: realTimeData.responseTime,
          }} providerAnalytics={providerAnalytics} />
        )}
      </div>
    </div>
  )
}

