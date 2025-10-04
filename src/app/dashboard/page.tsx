'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardData } from '../../hooks/useDashboardData'
import {
  MessageSquare, TrendingUp, Zap, DollarSign,
  Activity, Crown, Star, Leaf, BarChart3,
  Clock, CheckCircle, Database, Sparkles
} from 'lucide-react'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [quotaData, setQuotaData] = useState<any>(null)

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

  // Refresh data periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(refresh, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user, refresh])

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-600 mt-1">Track your usage, costs, and model performance</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Messages Used */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Messages</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">
                {quotaData?.used?.messages || 0}
              </p>
              <p className="text-sm text-gray-600">
                of {quotaData?.limits?.messages || '∞'} used
                {quotaData?.allTimeMessages && (
                  <span className="text-xs text-gray-500 ml-2">({quotaData.allTimeMessages} all-time)</span>
                )}
              </p>
            </div>
            {quotaData?.bonusMessages > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-emerald-600 font-medium">+{quotaData.bonusMessages} bonus</p>
              </div>
            )}
          </div>

          {/* API Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">API Calls</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(realTimeData?.totalApiCalls || 0)}
              </p>
              <p className="text-sm text-gray-600">model invocations</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {realTimeData?.totalMessages || 0} messages × avg {((realTimeData?.totalApiCalls || 0) / Math.max(realTimeData?.totalMessages || 1, 1)).toFixed(1)} models
              </p>
            </div>
          </div>

          {/* Cost (User-Paid Only) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Cost</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">
                ${(realTimeData?.totalCost || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">API keys + CLI only</p>
            </div>
            {realTimeData?.costBreakdown && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                {realTimeData.costBreakdown.userApiKeys > 0 && (
                  <p className="text-xs text-gray-500">API: ${realTimeData.costBreakdown.userApiKeys.toFixed(3)}</p>
                )}
                {realTimeData.costBreakdown.userCli > 0 && (
                  <p className="text-xs text-gray-500">CLI: ${realTimeData.costBreakdown.userCli.toFixed(3)}</p>
                )}
              </div>
            )}
          </div>

          {/* Tokens */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Database className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tokens</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(realTimeData?.tokenBreakdown?.total || 0)}
              </p>
              <p className="text-sm text-gray-600">all sources</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Admin credits included</p>
            </div>
          </div>
        </div>

        {/* Perspectives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Premium */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Premium Perspectives</p>
                <p className="text-xs opacity-75">Highest quality models</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">{quotaData?.remaining?.premium || 0}</p>
                  <p className="text-sm opacity-75">remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{quotaData?.used?.premium || 0} / {quotaData?.limits?.premium || 0}</p>
                  <p className="text-xs opacity-75">{quotaData?.percentages?.premium?.toFixed(0) || 0}% used</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${quotaData?.percentages?.premium || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Normal */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Star className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Normal Perspectives</p>
                <p className="text-xs opacity-75">Balanced performance</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">{quotaData?.remaining?.normal || 0}</p>
                  <p className="text-sm opacity-75">remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{quotaData?.used?.normal || 0} / {quotaData?.limits?.normal || 0}</p>
                  <p className="text-xs opacity-75">{quotaData?.percentages?.normal?.toFixed(0) || 0}% used</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${quotaData?.percentages?.normal || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Eco */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">Eco Perspectives</p>
                <p className="text-xs opacity-75">Cost-effective models</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">{quotaData?.remaining?.eco || 0}</p>
                  <p className="text-sm opacity-75">remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{quotaData?.used?.eco || 0} / {quotaData?.limits?.eco || 0}</p>
                  <p className="text-xs opacity-75">{quotaData?.percentages?.eco?.toFixed(0) || 0}% used</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${quotaData?.percentages?.eco || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData?.responseTime || 0}ms</p>
              </div>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min((realTimeData?.responseTime || 0) / 10, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData?.uptime || '99.9%'}</p>
              </div>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: realTimeData?.uptime || '99.9%' }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Active Providers</p>
                <p className="text-2xl font-bold text-gray-900">{realTimeData?.activeProviders || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{realTimeData?.totalApiKeys || 0} API keys configured</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/chat"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <MessageSquare className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">New Chat</p>
                <p className="text-xs text-gray-500">Start conversation</p>
              </div>
            </Link>

            <Link
              href="/dashboard/models"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
            >
              <BarChart3 className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">API Keys</p>
                <p className="text-xs text-gray-500">Manage providers</p>
              </div>
            </Link>

            <Link
              href="/dashboard/credits"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all group"
            >
              <DollarSign className="h-5 w-5 text-gray-400 group-hover:text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Buy Credits</p>
                <p className="text-xs text-gray-500">Add balance</p>
              </div>
            </Link>

            <Link
              href="/dashboard/usage"
              className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
            >
              <TrendingUp className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">View Usage</p>
                <p className="text-xs text-gray-500">Detailed analytics</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
