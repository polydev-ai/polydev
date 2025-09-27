'use client'

import { useState } from 'react'

export default function AnalyticsSection({
  realTimeData,
  providerAnalytics,
  requestLogs = [],
}: {
  realTimeData: {
    totalRequests: number
    totalCost: number
    responseTime: number
  }
  providerAnalytics: any[] | null
  requestLogs?: any[]
}) {
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('requests')

  // Calculate enhanced metrics from request logs
  const calculateMetrics = () => {
    if (!requestLogs.length) {
      return {
        totalRequests: realTimeData.totalRequests,
        totalCost: realTimeData.totalCost,
        avgResponseTime: realTimeData.responseTime,
        successRate: 98,
        totalTokens: 0,
        avgTokensPerRequest: 0,
        topProviders: [],
        dailyStats: [],
        costTrends: [],
        performanceMetrics: {}
      }
    }

    const totalRequests = requestLogs.length
    const totalCost = requestLogs.reduce((sum, log) => sum + (log.cost || 0), 0)
    const totalTokens = requestLogs.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
    const successfulRequests = requestLogs.filter(log => log.status === 'success').length
    const totalResponseTime = requestLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0)

    // Payment method analytics
    const creditRequests = requestLogs.filter(log => log.paymentMethod === 'credits')
    const apiKeyRequests = requestLogs.filter(log => log.paymentMethod === 'api_key')
    const paymentMethodStats = {
      credits: {
        requests: creditRequests.length,
        cost: creditRequests.reduce((sum, log) => sum + (log.cost || 0), 0),
        tokens: creditRequests.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
      },
      apiKeys: {
        requests: apiKeyRequests.length,
        cost: apiKeyRequests.reduce((sum, log) => sum + (log.cost || 0), 0),
        tokens: apiKeyRequests.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
      }
    }

    // Daily stats for charts
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000)
      const dayLogs = requestLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        return logDate.toDateString() === date.toDateString()
      })
      return {
        date: date.toLocaleDateString('en', { weekday: 'short' }),
        requests: dayLogs.length,
        cost: dayLogs.reduce((sum, log) => sum + (log.cost || 0), 0),
        avgResponseTime: dayLogs.length > 0 ? dayLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / dayLogs.length : 0
      }
    })

    return {
      totalRequests,
      totalCost,
      avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : realTimeData.responseTime,
      successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100) : 98,
      totalTokens,
      avgTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
      dailyStats,
      paymentMethodStats
    }
  }

  const metrics = calculateMetrics()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Analytics & Usage</h2>
          <p className="text-gray-600 mt-1">Comprehensive analytics and insights from your API usage</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <div className="text-sm text-gray-500">
            Based on {requestLogs.length} requests
          </div>
        </div>
      </div>
      
      {/* Enhanced Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600 font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-blue-900">{metrics.totalRequests.toLocaleString()}</p>
              <p className="text-xs text-blue-500">
                {requestLogs.length > 0 ? `${Math.round(metrics.totalRequests / 7)}/day avg` : 'All time'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600 font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-green-900">${metrics.totalCost.toFixed(2)}</p>
              <p className="text-xs text-green-500">
                {metrics.totalRequests > 0 ? `$${(metrics.totalCost / metrics.totalRequests).toFixed(4)}/req` : 'Per request'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg shadow p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-600 font-medium">Avg Response</p>
              <p className="text-2xl font-bold text-purple-900">{metrics.avgResponseTime}ms</p>
              <p className="text-xs text-purple-500">
                {metrics.avgResponseTime < 500 ? 'Excellent' : metrics.avgResponseTime < 1000 ? 'Good' : 'Slow'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg shadow p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-sm text-yellow-600 font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-yellow-900">{metrics.successRate.toFixed(1)}%</p>
              <p className="text-xs text-yellow-500">
                {metrics.successRate >= 99 ? 'Excellent' : metrics.successRate >= 95 ? 'Good' : 'Needs attention'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tokens</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Tokens/Req</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.avgTokensPerRequest.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-xl font-semibold text-gray-900">{providerAnalytics?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Failed Requests</p>
                <p className="text-xl font-semibold text-gray-900">
                  {Math.round(metrics.totalRequests * (1 - metrics.successRate / 100))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Usage Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Usage Trends</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedMetric('requests')}
                className={`px-2 py-1 text-xs rounded ${selectedMetric === 'requests' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Requests
              </button>
              <button
                onClick={() => setSelectedMetric('cost')}
                className={`px-2 py-1 text-xs rounded ${selectedMetric === 'cost' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Cost
              </button>
            </div>
          </div>
          <div className="h-48">
            <div className="flex items-end justify-between h-40 border-b border-l border-gray-200 px-2 py-2">
              {metrics.dailyStats.map((day, i) => {
                const value = selectedMetric === 'requests' ? day.requests : day.cost
                const maxValue = Math.max(...metrics.dailyStats.map(d => selectedMetric === 'requests' ? d.requests : d.cost))
                const height = Math.max(8, maxValue > 0 ? (value / maxValue) * 150 : 8)
                return (
                  <div key={`day-${i}`} className="flex flex-col items-center">
                    <div
                      className={`${selectedMetric === 'requests' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} rounded-t w-6 transition-all duration-200 cursor-pointer`}
                      style={{ height: `${height}px` }}
                      title={`${day.date}: ${selectedMetric === 'requests' ? `${value} requests` : `$${value.toFixed(3)}`}`}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1 -rotate-45 origin-top">
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Avg Daily</p>
              <p className="font-semibold">
                {selectedMetric === 'requests'
                  ? `${Math.round(metrics.totalRequests / 7)} requests`
                  : `$${(metrics.totalCost / 7).toFixed(3)}`
                }
              </p>
            </div>
            <div>
              <p className="text-gray-600">Peak Day</p>
              <p className="font-semibold">
                {selectedMetric === 'requests'
                  ? `${Math.max(...metrics.dailyStats.map(d => d.requests))} requests`
                  : `$${Math.max(...metrics.dailyStats.map(d => d.cost)).toFixed(3)}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Provider Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Provider Distribution</h3>
          <div className="h-48 flex items-center justify-center">
            <div className="relative">
              {/* Enhanced pie chart with provider names */}
              <div className="w-32 h-32 rounded-full relative overflow-hidden" style={{
                background: providerAnalytics && providerAnalytics.length > 0 ? `conic-gradient(
                  #3B82F6 0deg ${(providerAnalytics[0]?.requests / Math.max(metrics.totalRequests, 1) * 360)}deg,
                  #10B981 ${(providerAnalytics[0]?.requests / Math.max(metrics.totalRequests, 1) * 360)}deg ${providerAnalytics.length > 1 ? ((providerAnalytics[0]?.requests + (providerAnalytics[1]?.requests || 0)) / Math.max(metrics.totalRequests, 1) * 360) : 360}deg,
                  #F59E0B ${providerAnalytics.length > 1 ? ((providerAnalytics[0]?.requests + (providerAnalytics[1]?.requests || 0)) / Math.max(metrics.totalRequests, 1) * 360) : 360}deg ${providerAnalytics.length > 2 ? ((providerAnalytics[0]?.requests + (providerAnalytics[1]?.requests || 0) + (providerAnalytics[2]?.requests || 0)) / Math.max(metrics.totalRequests, 1) * 360) : 360}deg,
                  #EF4444 ${providerAnalytics.length > 2 ? ((providerAnalytics[0]?.requests + (providerAnalytics[1]?.requests || 0) + (providerAnalytics[2]?.requests || 0)) / Math.max(metrics.totalRequests, 1) * 360) : 360}deg 360deg
                )` : 'conic-gradient(#E5E7EB 0deg 360deg)'
              }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{metrics.totalRequests}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {providerAnalytics && providerAnalytics.slice(0, 4).map((provider, index) => {
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
              const percentage = ((provider.requests / metrics.totalRequests) * 100).toFixed(1)
              return (
                <div key={`provider-dist-${provider.providerId || provider.name || index}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index] }}
                    />
                    <span className="text-gray-700 truncate">{provider.name}</span>
                  </div>
                  <span className="text-gray-900 font-medium">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            {/* Response Time Trend */}
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="font-medium">{metrics.avgResponseTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full ${metrics.avgResponseTime < 500 ? 'bg-green-500' : metrics.avgResponseTime < 1000 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (metrics.avgResponseTime / 2000) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Success Rate */}
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-medium">{metrics.successRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full ${metrics.successRate >= 99 ? 'bg-green-500' : metrics.successRate >= 95 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${metrics.successRate}%` }}
                ></div>
              </div>
            </div>

            {/* Cost Efficiency */}
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cost per Request</span>
                <span className="font-medium">
                  ${metrics.totalRequests > 0 ? (metrics.totalCost / metrics.totalRequests).toFixed(4) : '0.0000'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics.totalRequests > 0 && (metrics.totalCost / metrics.totalRequests) < 0.01
                  ? 'Very efficient'
                  : 'Monitor costs'
                }
              </div>
            </div>

            {/* Token Efficiency */}
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tokens per Request</span>
                <span className="font-medium">{metrics.avgTokensPerRequest.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {metrics.avgTokensPerRequest < 1000 ? 'Efficient' : metrics.avgTokensPerRequest < 5000 ? 'Moderate' : 'High usage'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Analytics */}
      {metrics.paymentMethodStats && (metrics.paymentMethodStats.credits.requests > 0 || metrics.paymentMethodStats.apiKeys.requests > 0) && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Credits Usage */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">💳</span>
                  </div>
                  <h4 className="font-medium text-orange-900">Polydev Credits</h4>
                </div>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                  {metrics.paymentMethodStats.credits.requests} requests
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-orange-600 font-medium">Cost</p>
                  <p className="text-lg font-bold text-orange-900">
                    ${metrics.paymentMethodStats.credits.cost.toFixed(3)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-orange-600 font-medium">Tokens</p>
                  <p className="text-lg font-bold text-orange-900">
                    {metrics.paymentMethodStats.credits.tokens.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-orange-600 font-medium">Avg/Req</p>
                  <p className="text-lg font-bold text-orange-900">
                    ${metrics.paymentMethodStats.credits.requests > 0 ? (metrics.paymentMethodStats.credits.cost / metrics.paymentMethodStats.credits.requests).toFixed(4) : '0.0000'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-orange-200">
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600">Percentage of total</span>
                  <span className="font-medium text-orange-800">
                    {metrics.totalRequests > 0 ? ((metrics.paymentMethodStats.credits.requests / metrics.totalRequests) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* API Keys Usage */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">🔑</span>
                  </div>
                  <h4 className="font-medium text-green-900">User API Keys</h4>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  {metrics.paymentMethodStats.apiKeys.requests} requests
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-green-600 font-medium">Cost</p>
                  <p className="text-lg font-bold text-green-900">
                    ${metrics.paymentMethodStats.apiKeys.cost.toFixed(3)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-green-600 font-medium">Tokens</p>
                  <p className="text-lg font-bold text-green-900">
                    {metrics.paymentMethodStats.apiKeys.tokens.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-green-600 font-medium">Avg/Req</p>
                  <p className="text-lg font-bold text-green-900">
                    ${metrics.paymentMethodStats.apiKeys.requests > 0 ? (metrics.paymentMethodStats.apiKeys.cost / metrics.paymentMethodStats.apiKeys.requests).toFixed(4) : '0.0000'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">Percentage of total</span>
                  <span className="font-medium text-green-800">
                    {metrics.totalRequests > 0 ? ((metrics.paymentMethodStats.apiKeys.requests / metrics.totalRequests) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Comparison */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Cost Comparison</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 font-medium">Credits vs API Keys</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {metrics.paymentMethodStats.apiKeys.cost > 0 && metrics.paymentMethodStats.credits.cost > 0
                    ? `${(metrics.paymentMethodStats.credits.cost / metrics.paymentMethodStats.apiKeys.cost).toFixed(1)}x`
                    : metrics.paymentMethodStats.credits.cost > 0 ? 'Credits only' : 'API Keys only'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">Cost ratio</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 font-medium">Most Used</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {metrics.paymentMethodStats.credits.requests > metrics.paymentMethodStats.apiKeys.requests ? '💳 Credits' : '🔑 API Keys'}
                </p>
                <p className="text-xs text-gray-500 mt-1">By request count</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 font-medium">Most Expensive</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {metrics.paymentMethodStats.credits.cost > metrics.paymentMethodStats.apiKeys.cost ? '💳 Credits' : '🔑 API Keys'}
                </p>
                <p className="text-xs text-gray-500 mt-1">By total cost</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow border border-blue-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-blue-600">Total Requests</p>
              <p className="text-2xl font-bold text-blue-900">{metrics.totalRequests.toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-1">
                {requestLogs.length > 0 ? `${Math.round(metrics.totalRequests / 7)}/day` : 'All time'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-600">Total Tokens</p>
              <p className="text-2xl font-bold text-green-900">{metrics.totalTokens.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-1">
                {metrics.totalRequests > 0 ? `${metrics.avgTokensPerRequest}/req` : 'Average'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current efficiency</span>
              <span className="font-medium text-blue-700">
                {metrics.successRate >= 99 ? 'Excellent' : metrics.successRate >= 95 ? 'Good' : 'Needs attention'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow border border-green-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-green-600">Total Spent</p>
              <p className="text-2xl font-bold text-green-900">${metrics.totalCost.toFixed(2)}</p>
              <p className="text-xs text-green-500 mt-1">
                {requestLogs.length > 0 ? `$${(metrics.totalCost / 7).toFixed(3)}/day` : 'All time'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600">Per Request</p>
              <p className="text-2xl font-bold text-purple-900">
                ${metrics.totalRequests > 0 ? (metrics.totalCost / metrics.totalRequests).toFixed(4) : '0.0000'}
              </p>
              <p className="text-xs text-purple-500 mt-1">
                {metrics.totalRequests > 0 && (metrics.totalCost / metrics.totalRequests) < 0.01 ? 'Efficient' : 'Monitor'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cost efficiency</span>
              <span className="font-medium text-green-700">
                {metrics.totalRequests > 0 && (metrics.totalCost / metrics.totalRequests) < 0.005 ? 'Very efficient' : 'Standard'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      {requestLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.successRate < 95 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Reliability Issue</h4>
                    <p className="text-xs text-red-600 mt-1">
                      Success rate is {metrics.successRate.toFixed(1)}%. Consider reviewing failed requests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {metrics.avgResponseTime > 1000 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Slow Response</h4>
                    <p className="text-xs text-yellow-600 mt-1">
                      Average response time is {metrics.avgResponseTime}ms. Consider optimizing requests.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {metrics.totalRequests > 0 && (metrics.totalCost / metrics.totalRequests) > 0.02 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Cost Optimization</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      Consider reviewing provider costs and optimizing token usage.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(metrics.successRate >= 95 && metrics.avgResponseTime <= 1000 && (metrics.totalCost / Math.max(metrics.totalRequests, 1)) <= 0.02) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Excellent Performance</h4>
                    <p className="text-xs text-green-600 mt-1">
                      Your API usage is well-optimized with good reliability and cost efficiency.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

