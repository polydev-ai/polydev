'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardData } from '../../hooks/useDashboardData'
import {
  MessageSquare, Zap, DollarSign, Database,
  Activity, Clock, CheckCircle, TrendingUp,
  ChevronRight, RefreshCw, Filter, Download
} from 'lucide-react'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [quotaData, setQuotaData] = useState<any>(null)
  const [requestLogs, setRequestLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsFilter, setLogsFilter] = useState('all')

  const {
    stats: realTimeData,
    loading: dataLoading,
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

  // Fetch request logs
  useEffect(() => {
    const fetchRequestLogs = async () => {
      if (!user) return
      setLogsLoading(true)
      try {
        const params = new URLSearchParams({ limit: '20', offset: '0' })
        if (logsFilter !== 'all') params.append('status', logsFilter)

        const response = await fetch(`/api/dashboard/request-logs?${params}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setRequestLogs(data.logs || [])
        }
      } catch (error) {
        console.error('Failed to fetch request logs:', error)
      } finally {
        setLogsLoading(false)
      }
    }
    fetchRequestLogs()
  }, [user, logsFilter])

  // Refresh data periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(refresh, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user, refresh])

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor usage, costs, and performance</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* Messages */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Messages</span>
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{quotaData?.used?.messages || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              of {quotaData?.limits?.messages || '∞'}
              {quotaData?.bonusMessages > 0 && <span className="text-emerald-600 ml-1">+{quotaData.bonusMessages}</span>}
            </p>
          </div>

          {/* API Calls */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">API Calls</span>
              <Zap className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(realTimeData?.totalApiCalls || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">model invocations</p>
          </div>

          {/* Cost */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Cost</span>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">${(realTimeData?.totalCost || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">API keys + CLI only</p>
          </div>

          {/* Tokens */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tokens</span>
              <Database className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatNumber(realTimeData?.tokenBreakdown?.total || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">all sources</p>
          </div>
        </div>

        {/* Perspectives */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          {/* Premium */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Premium</p>
                <p className="text-xs text-gray-500">Highest quality</p>
              </div>
              <span className="text-xs text-gray-400">{quotaData?.percentages?.premium?.toFixed(0) || 0}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-gray-900">{quotaData?.remaining?.premium || 0}</p>
              <p className="text-sm text-gray-500">{quotaData?.used?.premium || 0} / {quotaData?.limits?.premium || 0}</p>
            </div>
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.premium || 0}%` }}
              />
            </div>
          </div>

          {/* Normal */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Normal</p>
                <p className="text-xs text-gray-500">Balanced</p>
              </div>
              <span className="text-xs text-gray-400">{quotaData?.percentages?.normal?.toFixed(0) || 0}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-gray-900">{quotaData?.remaining?.normal || 0}</p>
              <p className="text-sm text-gray-500">{quotaData?.used?.normal || 0} / {quotaData?.limits?.normal || 0}</p>
            </div>
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.normal || 0}%` }}
              />
            </div>
          </div>

          {/* Eco */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Eco</p>
                <p className="text-xs text-gray-500">Cost-effective</p>
              </div>
              <span className="text-xs text-gray-400">{quotaData?.percentages?.eco?.toFixed(0) || 0}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-gray-900">{quotaData?.remaining?.eco || 0}</p>
              <p className="text-sm text-gray-500">{quotaData?.used?.eco || 0} / {quotaData?.limits?.eco || 0}</p>
            </div>
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.eco || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Avg Response Time</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{realTimeData?.avgResponseTime || 0}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Success Rate</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{realTimeData?.uptime || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Active Providers</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{realTimeData?.activeProviders || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Request Logs */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setLogsFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      logsFilter === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setLogsFilter('success')}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      logsFilter === 'success'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Success
                  </button>
                  <button
                    onClick={() => setLogsFilter('error')}
                    className={`px-3 py-1 text-xs font-medium rounded ${
                      logsFilter === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Errors
                  </button>
                </div>
              </div>
              <Link
                href="/dashboard/activity"
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <span>View all</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {logsLoading ? (
              <div className="px-6 py-8 text-center">
                <RefreshCw className="h-6 w-6 text-gray-400 animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading requests...</p>
              </div>
            ) : requestLogs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-500">No requests found</p>
              </div>
            ) : (
              requestLogs.map((log: any, idx: number) => (
                <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === 'success' || log.total_tokens > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status === 'success' || log.total_tokens > 0 ? 'Success' : 'Error'}
                        </span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {log.provider_responses && Object.keys(log.provider_responses).length > 0
                            ? Object.keys(log.provider_responses).join(', ')
                            : log.source || 'Unknown'}
                        </span>
                        {log.source && (
                          <span className="text-xs text-gray-500">
                            {log.source === 'mcp' ? 'MCP' : 'Chat'}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>{log.total_tokens?.toLocaleString() || 0} tokens</span>
                        <span>${(log.total_cost || 0).toFixed(4)}</span>
                        {log.response_time_ms && (
                          <span>{log.response_time_ms}ms</span>
                        )}
                        <span>{formatTimeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/activity"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/models"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Manage Models</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/subscription"
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Subscription</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>
        </div>
      </div>
    </div>
  )
}
