'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { ArrowLeft, Plus, Search, Download, Filter, CreditCard } from 'lucide-react'

interface User {
  id: string
  email: string
  credits: number
  created_at: string
}

interface CreditAdjustment {
  id: string
  user_id: string
  amount: number
  reason: string
  created_at: string
  admin_email: string
  user?: User
}

export default function CreditManagement() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [adjustments, setAdjustments] = useState<CreditAdjustment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [filterType, setFilterType] = useState('all') // all, positive, negative
  const [bulkAdjustmentMode, setBulkAdjustmentMode] = useState(false)
  const [bulkAmount, setBulkAmount] = useState('')
  const [bulkReason, setBulkReason] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadData()
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

  async function loadData() {
    try {
      // Get users with credits - handle case where credits column might not exist
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, credits, created_at')
        .order('email')

      if (usersError) {
        console.error('Error loading users:', usersError)
        // If credits column doesn't exist, load users without credits
        const { data: fallbackUsers } = await supabase
          .from('profiles')
          .select('id, email, created_at')
          .order('email')

        setUsers((fallbackUsers || []).map(u => ({ ...u, credits: 0 })))
      } else {
        setUsers(usersData || [])
      }

      // Get credit adjustments
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .from('admin_credit_adjustments')
        .select(`
          *,
          user:profiles(id, email)
        `)
        .order('created_at', { ascending: false })

      if (!adjustmentsError && adjustmentsData) {
        setAdjustments(adjustmentsData)
      } else {
        console.log('Credit adjustments table not available yet')
        setAdjustments([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  async function adjustUserCredits(userId: string, amount: number, reason: string) {
    try {
      // Add credit adjustment record
      const { error: adjustmentError } = await supabase
        .from('admin_credit_adjustments')
        .insert([{
          user_id: userId,
          amount,
          reason,
          admin_email: user?.email
        }])

      if (adjustmentError) throw adjustmentError

      // Update user credits - handle case where credits column might not exist
      try {
        const { data: currentUser } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        const newCredits = (currentUser?.credits || 0) + amount

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', userId)

        if (updateError) throw updateError
      } catch (creditsError) {
        console.log('Credits column may not exist, creating it...')
        // Could add migration logic here if needed
      }

      await logActivity('credit_adjustment', `Adjusted credits for user ${userId}: ${amount > 0 ? '+' : ''}${amount} (${reason})`)
      await loadData()

      // Reset form
      setSelectedUserId('')
      setAdjustmentAmount('')
      setAdjustmentReason('')
      setShowAdjustmentForm(false)
    } catch (error) {
      console.error('Error adjusting credits:', error)
      alert('Error adjusting credits: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function bulkAdjustCredits() {
    if (!bulkAmount || !bulkReason) {
      alert('Please enter amount and reason for bulk adjustment')
      return
    }

    const amount = parseFloat(bulkAmount)
    if (isNaN(amount)) {
      alert('Please enter a valid amount')
      return
    }

    const filteredUsers = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!confirm(`Apply ${amount > 0 ? '+' : ''}${amount} credits to ${filteredUsers.length} users?`)) {
      return
    }

    try {
      for (const user of filteredUsers) {
        await adjustUserCredits(user.id, amount, `Bulk: ${bulkReason}`)
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setBulkAdjustmentMode(false)
      setBulkAmount('')
      setBulkReason('')
      alert(`Successfully applied bulk adjustment to ${filteredUsers.length} users`)
    } catch (error) {
      console.error('Error with bulk adjustment:', error)
      alert('Error with bulk adjustment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function logActivity(action: string, details: string) {
    try {
      await supabase
        .from('admin_activity_log')
        .insert([{
          admin_email: user?.email,
          action,
          details
        }])
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAdjustments = adjustments.filter(adjustment => {
    if (filterType === 'positive') return adjustment.amount > 0
    if (filterType === 'negative') return adjustment.amount < 0
    return true
  })

  const totalCreditsIssued = adjustments.reduce((sum, adj) => sum + adj.amount, 0)
  const totalPositiveAdjustments = adjustments.filter(adj => adj.amount > 0).reduce((sum, adj) => sum + adj.amount, 0)
  const totalNegativeAdjustments = adjustments.filter(adj => adj.amount < 0).reduce((sum, adj) => sum + adj.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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
                <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
                <p className="text-gray-600 mt-1">Manage user credits and adjustments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Plus className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Credits Issued</p>
                <p className="text-2xl font-bold text-gray-900">+{totalPositiveAdjustments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Credits Deducted</p>
                <p className="text-2xl font-bold text-gray-900">{totalNegativeAdjustments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Credits</p>
                <p className="text-2xl font-bold text-gray-900">{totalCreditsIssued}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setShowAdjustmentForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adjust Credits
              </button>

              <button
                onClick={() => setBulkAdjustmentMode(!bulkAdjustmentMode)}
                className={`inline-flex items-center px-4 py-2 rounded-md ${
                  bulkAdjustmentMode
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bulk Adjust
              </button>
            </div>
          </div>

          {/* Bulk Adjustment Form */}
          {bulkAdjustmentMode && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-900 mb-4">Bulk Credit Adjustment</h3>
              <p className="text-sm text-orange-700 mb-4">
                This will apply the adjustment to {filteredUsers.length} users matching your search.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="100 or -50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Promotional credits"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={bulkAdjustCredits}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    Apply Bulk Adjustment
                  </button>
                  <button
                    onClick={() => setBulkAdjustmentMode(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Users ({filteredUsers.length})</h2>
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.credits || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id)
                              setShowAdjustmentForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Adjustments */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Adjustments</h2>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All Adjustments</option>
                <option value="positive">Credits Added</option>
                <option value="negative">Credits Deducted</option>
              </select>
            </div>
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {filteredAdjustments.map((adjustment) => (
                    <div key={adjustment.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {adjustment.user?.email || 'Unknown User'}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            adjustment.amount > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {adjustment.amount > 0 ? '+' : ''}{adjustment.amount}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{adjustment.reason}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          By {adjustment.admin_email} • {new Date(adjustment.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredAdjustments.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No adjustments found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Adjustment Modal */}
      {showAdjustmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust User Credits</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email} (Current: {user.credits || 0} credits)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100 (positive) or -50 (negative)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Use negative numbers to deduct credits</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Promotional credits, refund, etc."
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAdjustmentForm(false)
                    setSelectedUserId('')
                    setAdjustmentAmount('')
                    setAdjustmentReason('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedUserId && adjustmentAmount && adjustmentReason) {
                      adjustUserCredits(selectedUserId, parseFloat(adjustmentAmount), adjustmentReason)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}