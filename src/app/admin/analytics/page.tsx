'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Key,
  Gift,
  ArrowLeft
} from 'lucide-react'

interface SystemStats {
  total_users: number
  new_users_this_month: number
  active_users_this_month: number
  total_messages_this_month: number
  premium_perspectives_this_month: number
  normal_perspectives_this_month: number
  eco_perspectives_this_month: number
  total_cost_this_month: number
  free_users: number
  plus_users: number
  pro_users: number
}

interface DailyTrend {
  date: string
  total_requests: number
  active_users: number
  total_cost: number
  premium_requests: number
  normal_requests: number
  eco_requests: number
  bonus_messages_used: number
}

interface ProviderData {
  provider: string
  total_requests: number
  unique_users: number
  total_cost: number
  total_tokens: number
}

interface ModelData {
  model_name: string
  model_tier: string
  provider: string
  total_requests: number
  unique_users: number
  total_cost: number
  avg_cost: number
}

interface AdminKeyData {
  provider_source_id: string
  key_name: string
  key_provider: string
  total_requests: number
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
}

interface UserKeyData {
  total_user_keys: number
  users_with_keys: number
  provider: string
  keys_per_provider: number
}

interface BonusData {
  bonus_type: string
  total_bonuses: number
  total_messages_granted: number
  total_messages_used: number
  total_messages_remaining: number
  active_bonuses: number
  expired_bonuses: number
  fully_used_bonuses: number
}

interface TopUser {
  user_id: string
  email: string
  current_plan_tier: string
  total_requests: number
  total_cost: number
  last_activity: string
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([])
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [models, setModels] = useState<ModelData[]>([])
  const [adminKeys, setAdminKeys] = useState<AdminKeyData[]>([])
  const [userKeys, setUserKeys] = useState<UserKeyData[]>([])
  const [bonuses, setBonuses] = useState<BonusData[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      await loadAllAnalytics()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadAllAnalytics = async () => {
    try {
      // Load all analytics in parallel
      const [
        systemResponse,
        trendsResponse,
        providersResponse,
        modelsResponse,
        adminKeysResponse,
        userKeysResponse,
        bonusesResponse,
        topUsersResponse
      ] = await Promise.all([
        fetch('/api/admin/analytics?type=system'),
        fetch('/api/admin/analytics?type=daily-trends'),
        fetch('/api/admin/analytics?type=providers'),
        fetch('/api/admin/analytics?type=models'),
        fetch('/api/admin/analytics?type=admin-keys'),
        fetch('/api/admin/analytics?type=user-keys'),
        fetch('/api/admin/analytics?type=bonuses'),
        fetch('/api/admin/analytics?type=top-users')
      ])

      const [system, trends, provs, mods, adminK, userK, bonus, topU] = await Promise.all([
        systemResponse.json(),
        trendsResponse.json(),
        providersResponse.json(),
        modelsResponse.json(),
        adminKeysResponse.json(),
        userKeysResponse.json(),
        bonusesResponse.json(),
        topUsersResponse.json()
      ])

      setSystemStats(system.data)
      setDailyTrends(trends.data || [])
      setProviders(provs.data || [])
      setModels(mods.data || [])
      setAdminKeys(adminK.data || [])
      setUserKeys(userK.data || [])
      setBonuses(bonus.data || [])
      setTopUsers(topU.data || [])
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num))
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Portal
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive analytics for the perspective-based quota system
            </p>
          </div>
        </div>

        {/* System Stats Overview */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{formatNumber(systemStats.total_users)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNumber(systemStats.new_users_this_month)} new this month
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Messages This Month</p>
                    <p className="text-2xl font-bold">{formatNumber(systemStats.total_messages_this_month)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNumber(systemStats.active_users_this_month)} active users
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold">{formatCost(systemStats.total_cost_this_month)}</p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Plan Distribution</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(systemStats.free_users + systemStats.plus_users + systemStats.pro_users)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {systemStats.free_users}F / {systemStats.plus_users}+ / {systemStats.pro_users}P
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Perspectives Breakdown */}
        {systemStats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Perspective Usage This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Premium</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(systemStats.premium_perspectives_this_month)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Normal</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(systemStats.normal_perspectives_this_month)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Eco</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(systemStats.eco_perspectives_this_month)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Detailed Analytics */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Daily Trends</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="admin-keys">Admin Keys</TabsTrigger>
            <TabsTrigger value="user-keys">User Keys</TabsTrigger>
            <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
            <TabsTrigger value="top-users">Top Users</TabsTrigger>
          </TabsList>

          {/* Daily Trends Tab */}
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage Trends (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Active Users</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead className="text-right">Normal</TableHead>
                      <TableHead className="text-right">Eco</TableHead>
                      <TableHead className="text-right">Bonus Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyTrends.slice(0, 30).map((trend) => (
                      <TableRow key={trend.date}>
                        <TableCell>{new Date(trend.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{formatNumber(trend.total_requests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(trend.active_users)}</TableCell>
                        <TableCell className="text-right">{formatCost(trend.total_cost)}</TableCell>
                        <TableCell className="text-right">{formatNumber(trend.premium_requests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(trend.normal_requests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(trend.eco_requests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(trend.bonus_messages_used)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Providers Tab */}
          <TabsContent value="providers">
            <Card>
              <CardHeader>
                <CardTitle>Provider Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Total Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.provider}>
                        <TableCell className="font-medium">{provider.provider}</TableCell>
                        <TableCell className="text-right">{formatNumber(provider.total_requests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(provider.unique_users)}</TableCell>
                        <TableCell className="text-right">{formatCost(provider.total_cost)}</TableCell>
                        <TableCell className="text-right">{formatNumber(provider.total_tokens)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle>Model Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.slice(0, 20).map((model, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{model.model_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            model.model_tier === 'premium' ? 'bg-purple-100 text-purple-700' :
                            model.model_tier === 'normal' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {model.model_tier}
                          </span>
                        </TableCell>
                        <TableCell>{model.provider}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.total_requests)}</TableCell>
                        <TableCell className="text-right">{formatCost(model.total_cost)}</TableCell>
                        <TableCell className="text-right">{formatCost(model.avg_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Keys Tab */}
          <TabsContent value="admin-keys">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Admin API Keys Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Input Tokens</TableHead>
                      <TableHead className="text-right">Output Tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminKeys.map((key) => (
                      <TableRow key={key.provider_source_id}>
                        <TableCell className="font-medium">{key.key_name}</TableCell>
                        <TableCell>{key.key_provider}</TableCell>
                        <TableCell className="text-right">{formatNumber(key.total_requests)}</TableCell>
                        <TableCell className="text-right">{formatCost(key.total_cost)}</TableCell>
                        <TableCell className="text-right">{formatNumber(key.total_input_tokens)}</TableCell>
                        <TableCell className="text-right">{formatNumber(key.total_output_tokens)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Keys Tab */}
          <TabsContent value="user-keys">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  User API Keys Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Total Keys</TableHead>
                      <TableHead className="text-right">Users With Keys</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userKeys.map((key, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{key.provider}</TableCell>
                        <TableCell className="text-right">{formatNumber(key.keys_per_provider)}</TableCell>
                        <TableCell className="text-right">{formatNumber(key.users_with_keys)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Bonus Quotas Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bonus Type</TableHead>
                      <TableHead className="text-right">Total Bonuses</TableHead>
                      <TableHead className="text-right">Messages Granted</TableHead>
                      <TableHead className="text-right">Messages Used</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Expired/Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonuses.map((bonus) => (
                      <TableRow key={bonus.bonus_type}>
                        <TableCell className="font-medium">{bonus.bonus_type}</TableCell>
                        <TableCell className="text-right">{formatNumber(bonus.total_bonuses)}</TableCell>
                        <TableCell className="text-right">{formatNumber(bonus.total_messages_granted)}</TableCell>
                        <TableCell className="text-right">{formatNumber(bonus.total_messages_used)}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatNumber(bonus.total_messages_remaining)}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(bonus.active_bonuses)}</TableCell>
                        <TableCell className="text-right text-gray-500">
                          {formatNumber(bonus.expired_bonuses + bonus.fully_used_bonuses)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Users Tab */}
          <TabsContent value="top-users">
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.current_plan_tier === 'pro' ? 'bg-purple-100 text-purple-700' :
                            user.current_plan_tier === 'plus' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {user.current_plan_tier}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(user.total_requests)}</TableCell>
                        <TableCell className="text-right">{formatCost(user.total_cost)}</TableCell>
                        <TableCell>{user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}