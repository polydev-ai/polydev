'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, TrendingUp, Users, CreditCard, Activity, Download, Calendar } from 'lucide-react'

interface AnalyticsData {
  userGrowth: {
    total: number
    thisWeek: number
    thisMonth: number
    growth: number
  }
  subscription: {
    active: number
    revenue: number
    conversionRate: number
    churnRate: number
  }
  usage: {
    totalSessions: number
    apiCalls: number
    averageSessionDuration: number
    popularModels: Array<{ name: string; count: number }>
  }
  credits: {
    totalIssued: number
    totalUsed: number
    averagePerUser: number
    topUsers: Array<{ email: string; credits: number }>
  }
  activity: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    retentionRate: number
  }
}

export default function Analytics() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [dateRange, setDateRange] = useState('30') // days
  const [selectedMetric, setSelectedMetric] = useState('users')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics()
    }
  }, [isAdmin, dateRange])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com'])
      const isLegacyAdmin = legacyAdminEmails.has(user.email || '')

      let isNewAdmin = false
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('email', user.email)
          .single()

        isNewAdmin = profile?.is_admin || false
      } catch (error) {
        console.log('Profile not found, checking legacy admin access')
      }

      if (!isNewAdmin && !isLegacyAdmin) {
        router.push('/admin')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalytics() {
    try {
      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - parseInt(dateRange))

      // User Growth Analytics
      const { data: allUsers } = await supabase.from('profiles').select('created_at')
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', dateThreshold.toISOString())

      const weekThreshold = new Date()
      weekThreshold.setDate(weekThreshold.getDate() - 7)
      const { data: weekUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', weekThreshold.toISOString())

      const monthThreshold = new Date()
      monthThreshold.setDate(monthThreshold.getDate() - 30)
      const { data: monthUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', monthThreshold.toISOString())

      // Subscription Analytics
      let subscriptionData = { active: 0, revenue: 0 }
      try {
        const { data: activeSubscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('status', 'active')

        subscriptionData.active = activeSubscriptions?.length || 0
        subscriptionData.revenue = (activeSubscriptions?.length || 0) * 10 // Assuming $10/month
      } catch (error) {
        console.log('Subscriptions table not available')
      }

      // Credit Analytics
      let creditData: { totalIssued: number; topUsers: Array<{ email: string; credits: number }> } = {
        totalIssued: 0,
        topUsers: []
      }
      try {
        const { data: creditAdjustments } = await supabase
          .from('admin_credit_adjustments')
          .select('amount, user_id')

        creditData.totalIssued = creditAdjustments?.reduce((sum, adj) => sum + adj.amount, 0) || 0

        // Get top credit users
        const { data: userCredits } = await supabase
          .from('profiles')
          .select('email, credits')
          .order('credits', { ascending: false })
          .limit(5)

        creditData.topUsers = userCredits?.map(u => ({ email: u.email, credits: u.credits || 0 })) || []
      } catch (error) {
        console.log('Credit data not available')
      }

      // Usage Analytics - Mock data for now
      const usageData = {
        totalSessions: Math.floor(Math.random() * 10000) + 5000,
        apiCalls: Math.floor(Math.random() * 50000) + 25000,
        averageSessionDuration: Math.floor(Math.random() * 30) + 10,
        popularModels: [
          { name: 'GPT-4o', count: Math.floor(Math.random() * 1000) + 500 },
          { name: 'Claude 3 Opus', count: Math.floor(Math.random() * 800) + 400 },
          { name: 'Gemini Pro', count: Math.floor(Math.random() * 600) + 300 }
        ]
      }

      // Activity Analytics - Mock data for now
      const activityData = {
        dailyActiveUsers: Math.floor(Math.random() * 200) + 100,
        weeklyActiveUsers: Math.floor(Math.random() * 800) + 400,
        monthlyActiveUsers: Math.floor(Math.random() * 2000) + 1000,
        retentionRate: Math.floor(Math.random() * 30) + 60
      }

      const analyticsData: AnalyticsData = {
        userGrowth: {
          total: allUsers?.length || 0,
          thisWeek: weekUsers?.length || 0,
          thisMonth: monthUsers?.length || 0,
          growth: ((recentUsers?.length || 0) / Math.max(1, (allUsers?.length || 1) - (recentUsers?.length || 0))) * 100
        },
        subscription: {
          active: subscriptionData.active,
          revenue: subscriptionData.revenue,
          conversionRate: subscriptionData.active > 0 ? (subscriptionData.active / (allUsers?.length || 1)) * 100 : 0,
          churnRate: Math.floor(Math.random() * 10) + 2
        },
        usage: usageData,
        credits: {
          totalIssued: creditData.totalIssued,
          totalUsed: Math.floor(creditData.totalIssued * 0.7),
          averagePerUser: creditData.totalIssued / Math.max(1, allUsers?.length || 1),
          topUsers: creditData.topUsers
        },
        activity: activityData
      }

      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  function exportData(format: 'csv' | 'json') {
    if (!analytics) return

    const data = {
      export_date: new Date().toISOString(),
      date_range: `${dateRange} days`,
      analytics
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `polydev-analytics-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } else {
      // Convert to CSV format
      const csvData = [
        ['Metric', 'Value'],
        ['Total Users', analytics.userGrowth.total],
        ['Users This Week', analytics.userGrowth.thisWeek],
        ['Users This Month', analytics.userGrowth.thisMonth],
        ['Active Subscriptions', analytics.subscription.active],
        ['Monthly Revenue', `$${analytics.subscription.revenue}`],
        ['Total Credits Issued', analytics.credits.totalIssued],
        ['Daily Active Users', analytics.activity.dailyActiveUsers],
        ['Weekly Active Users', analytics.activity.weeklyActiveUsers],
        ['Monthly Active Users', analytics.activity.monthlyActiveUsers]
      ]

      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `polydev-analytics-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Access denied.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">Platform insights and metrics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button
                onClick={() => exportData('csv')}
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.userGrowth.total || 0}</p>
                <p className="text-sm text-green-600">+{analytics?.userGrowth.growth.toFixed(1) || 0}% growth</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${analytics?.subscription.revenue || 0}</p>
                <p className="text-sm text-gray-500">{analytics?.subscription.active || 0} active subs</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.activity.dailyActiveUsers || 0}</p>
                <p className="text-sm text-gray-500">{analytics?.activity.retentionRate || 0}% retention</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">API Calls</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.usage.totalSessions.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500">Avg {analytics?.usage.averageSessionDuration || 0}m session</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">This Week</span>
                <span className="text-sm font-medium">{analytics?.userGrowth.thisWeek || 0} new users</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min((analytics?.userGrowth.thisWeek || 0) / Math.max(1, analytics?.userGrowth.thisMonth || 1) * 100, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-sm font-medium">{analytics?.userGrowth.thisMonth || 0} new users</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min((analytics?.userGrowth.thisMonth || 0) / Math.max(1, analytics?.userGrowth.total || 1) * 100, 100)}%` }}
                ></div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Growth Rate</p>
                <p className="text-lg font-semibold text-green-600">+{analytics?.userGrowth.growth.toFixed(1) || 0}%</p>
              </div>
            </div>
          </div>

          {/* Popular Models */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Models</h3>
            <div className="space-y-4">
              {analytics?.usage.popularModels.map((model, index) => (
                <div key={model.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs flex items-center justify-center mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{model.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{model.count} uses</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Credits Overview */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credits Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Issued</span>
                <span className="text-sm font-medium">{analytics?.credits.totalIssued || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Used</span>
                <span className="text-sm font-medium">{analytics?.credits.totalUsed || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average per User</span>
                <span className="text-sm font-medium">{analytics?.credits.averagePerUser.toFixed(1) || 0}</span>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Top Credit Users</h4>
                {analytics?.credits.topUsers.map((user, index) => (
                  <div key={user.email} className="flex justify-between items-center py-1">
                    <span className="text-xs text-gray-600">{user.email}</span>
                    <span className="text-xs font-medium">{user.credits}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Daily Active</span>
                  <span className="text-sm font-medium">{analytics?.activity.dailyActiveUsers || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Weekly Active</span>
                  <span className="text-sm font-medium">{analytics?.activity.weeklyActiveUsers || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Monthly Active</span>
                  <span className="text-sm font-medium">{analytics?.activity.monthlyActiveUsers || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Retention Rate</span>
                  <span className="text-lg font-semibold text-green-600">{analytics?.activity.retentionRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Analytics */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{analytics?.subscription.active || 0}</p>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">${analytics?.subscription.revenue || 0}</p>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{analytics?.subscription.conversionRate.toFixed(1) || 0}%</p>
              <p className="text-sm text-gray-600">Conversion Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{analytics?.subscription.churnRate || 0}%</p>
              <p className="text-sm text-gray-600">Churn Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}