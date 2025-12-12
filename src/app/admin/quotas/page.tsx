'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Search, Target, Zap, Clock, RefreshCw, User, Edit, Home } from 'lucide-react'

interface UserQuotaInfo {
  id: string
  user_id: string
  email: string
  plan_tier: string
  messages_per_month: number | null
  messages_used: number
  premium_perspectives_limit: number
  premium_perspectives_used: number
  normal_perspectives_limit: number
  normal_perspectives_used: number
  eco_perspectives_limit: number
  eco_perspectives_used: number
  current_month_start: string
  last_reset_date: string
  created_at: string
}

interface QuotaUpdateModal {
  user: UserQuotaInfo | null
  field: 'plan_tier' | 'messages_per_month' | 'premium_limit' | 'normal_limit' | 'eco_limit' | null
}

export default function QuotaManagement() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserQuotaInfo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [updateModal, setUpdateModal] = useState<QuotaUpdateModal>({ user: null, field: null })
  const [newValue, setNewValue] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadQuotaData()
    }
  }, [isAdmin])

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
          .eq('id', user.id)
          .single()

        isNewAdmin = profile?.is_admin || false
      } catch (error) {
        console.log('Profile check failed, using legacy admin check')
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

  async function loadQuotaData() {
    try {
      console.log('📊 Loading quota data via admin API...')

      const response = await fetch('/api/admin/quotas')

      if (!response.ok) {
        throw new Error(`Admin quotas API failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load quotas')
      }

      console.log(`✅ Loaded ${data.quotas?.length || 0} user quotas`)
      setUsers(data.quotas || [])
    } catch (error) {
      console.error('Error loading quota data:', error)
      setUsers([])
    }
  }

  async function updateUserQuota(userId: string, field: string, value: any) {
    try {
      const dbField = field === 'premium_limit' ? 'premium_perspectives_limit'
        : field === 'normal_limit' ? 'normal_perspectives_limit'
        : field === 'eco_limit' ? 'eco_perspectives_limit'
        : field

      const response = await fetch('/api/admin/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'update',
          field: dbField,
          value: field === 'messages_per_month' && value === '' ? null :
                 field === 'plan_tier' ? value : parseInt(value)
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update quota')
      }

      await loadQuotaData()
      setUpdateModal({ user: null, field: null })
      setNewValue('')
    } catch (error) {
      console.error('Error updating quota:', error)
      alert('Error updating quota: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function resetUserQuota(userId: string) {
    if (!confirm('Are you sure you want to reset monthly usage for this user?')) {
      return
    }

    try {
      const response = await fetch('/api/admin/quotas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'reset'
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset quota')
      }

      await loadQuotaData()
    } catch (error) {
      console.error('Error resetting quota:', error)
      alert('Error resetting quota: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    switch (filterTier) {
      case 'free':
        return user.plan_tier === 'free'
      case 'plus':
        return user.plan_tier === 'plus'
      case 'pro':
        return user.plan_tier === 'pro'
      default:
        return true
    }
  })

  const stats = {
    totalUsers: users.length,
    freeUsers: users.filter(u => u.plan_tier === 'free').length,
    plusUsers: users.filter(u => u.plan_tier === 'plus').length,
    proUsers: users.filter(u => u.plan_tier === 'pro').length,
    totalPremiumUsage: users.reduce((sum, u) => sum + (u.premium_perspectives_used || 0), 0),
    totalNormalUsage: users.reduce((sum, u) => sum + (u.normal_perspectives_used || 0), 0),
    totalEcoUsage: users.reduce((sum, u) => sum + (u.eco_perspectives_used || 0), 0)
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-slate-900'
    if (percentage >= 75) return 'bg-slate-600'
    return 'bg-slate-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg text-slate-900">Access denied.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Admin Portal"
              >
                <Home className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Quota Management</h1>
                <p className="text-slate-600 mt-1">Manage user perspective quotas and limits</p>
              </div>
            </div>
            <button
              onClick={loadQuotaData}
              className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <User className="h-8 w-8 text-slate-900" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                <p className="text-xs text-slate-500">
                  Free: {stats.freeUsers} | Plus: {stats.plusUsers} | Pro: {stats.proUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-slate-900" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Premium Usage</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalPremiumUsage}</p>
                <p className="text-xs text-slate-500">High-tier model perspectives</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-slate-900" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Normal Usage</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalNormalUsage}</p>
                <p className="text-xs text-slate-500">Mid-tier model perspectives</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-slate-900" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Eco Usage</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalEcoUsage}</p>
                <p className="text-xs text-slate-500">Low-tier model perspectives</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 w-80"
                />
              </div>

              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free Tier</option>
                <option value="plus">Plus Tier</option>
                <option value="pro">Pro Tier</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quotas Table */}
        <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Messages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Premium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Normal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Eco</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Reset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id || user.user_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-900">{user.email || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">ID: {(user.user_id || user.id || '').slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-900 border border-slate-200">
                      {(user.plan_tier || 'free').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {user.messages_used || 0} / {user.messages_per_month || '∞'}
                    </div>
                    {user.messages_per_month && (
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${getUsageColor(getUsagePercentage(user.messages_used || 0, user.messages_per_month))}`}
                          style={{ width: `${getUsagePercentage(user.messages_used || 0, user.messages_per_month)}%` }}
                        ></div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {user.premium_perspectives_used || 0} / {user.premium_perspectives_limit || 0}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${getUsageColor(getUsagePercentage(user.premium_perspectives_used || 0, user.premium_perspectives_limit || 1))}`}
                        style={{ width: `${getUsagePercentage(user.premium_perspectives_used || 0, user.premium_perspectives_limit || 1)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {user.normal_perspectives_used || 0} / {user.normal_perspectives_limit || 0}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${getUsageColor(getUsagePercentage(user.normal_perspectives_used || 0, user.normal_perspectives_limit || 1))}`}
                        style={{ width: `${getUsagePercentage(user.normal_perspectives_used || 0, user.normal_perspectives_limit || 1)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      {user.eco_perspectives_used || 0} / {user.eco_perspectives_limit || 0}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${getUsageColor(getUsagePercentage(user.eco_perspectives_used || 0, user.eco_perspectives_limit || 1))}`}
                        style={{ width: `${getUsagePercentage(user.eco_perspectives_used || 0, user.eco_perspectives_limit || 1)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {user.last_reset_date ? new Date(user.last_reset_date).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setUpdateModal({ user, field: 'plan_tier' })}
                        className="text-slate-900 hover:text-slate-700"
                        title="Edit Plan"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => resetUserQuota(user.user_id || user.id)}
                        className="text-slate-900 hover:text-slate-700"
                        title="Reset Monthly Usage"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No users found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'No quota data available yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Update Quota Modal */}
      {updateModal.user && updateModal.field && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Edit className="h-6 w-6 text-slate-900 mr-3" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Update {updateModal.field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h3>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                Update {updateModal.field.replace('_', ' ')} for {updateModal.user.email}
              </p>

              <div className="mb-6">
                {updateModal.field === 'plan_tier' ? (
                  <select
                    value={newValue || updateModal.user.plan_tier || 'free'}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="free">Free</option>
                    <option value="plus">Plus</option>
                    <option value="pro">Pro</option>
                  </select>
                ) : (
                  <input
                    type={updateModal.field === 'messages_per_month' ? 'text' : 'number'}
                    placeholder={updateModal.field === 'messages_per_month' ? 'Leave empty for unlimited' : 'Enter number'}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setUpdateModal({ user: null, field: null })
                    setNewValue('')
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateUserQuota(updateModal.user!.user_id || updateModal.user!.id, updateModal.field!, newValue || (updateModal.field === 'plan_tier' ? updateModal.user!.plan_tier : ''))}
                  className="px-4 py-2 text-white bg-slate-900 rounded-md hover:bg-slate-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
