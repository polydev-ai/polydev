'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { ArrowLeft, Search, Shield, ShieldCheck, User, Mail, Calendar, CreditCard, Home } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  credits: number
  is_admin: boolean
  created_at: string
  subscription_status?: string
  last_login?: string
}

export default function UserManagement() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, admin, regular, subscribed
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
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

  async function loadUsers() {
    try {
      console.log('📊 Loading users from dedicated admin API...')

      // Use dedicated admin users API that bypasses RLS
      const response = await fetch('/api/admin/users')

      if (!response.ok) {
        throw new Error(`Admin users API failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load users')
      }

      console.log(`✅ Admin Users API: Loaded ${data.count} users`)
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      // Fallback to empty array
      setUsers([])
    }
  }

  async function toggleAdminRole(userId: string, currentAdminStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentAdminStatus ? 'remove admin access from' : 'grant admin access to'} this user?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          action: 'toggle_admin',
          value: !currentAdminStatus
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user role')
      }

      await logActivity(
        'toggle_admin_role',
        `${!currentAdminStatus ? 'Granted admin access to' : 'Removed admin access from'} user: ${userId}`
      )

      await loadUsers()
      setShowRoleModal(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating admin role:', error)
      alert('Error updating admin role: ' + (error instanceof Error ? error.message : 'Unknown error'))
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    switch (filterStatus) {
      case 'admin':
        return user.is_admin
      case 'regular':
        return !user.is_admin
      case 'subscribed':
        return user.subscription_status === 'active'
      default:
        return true
    }
  })

  const stats = {
    totalUsers: users.length,
    adminUsers: users.filter(u => u.is_admin).length,
    subscribedUsers: users.filter(u => u.subscription_status === 'active').length,
    totalCredits: users.reduce((sum, u) => sum + (u.credits || 0), 0)
  }

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
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Admin Portal"
              >
                <Home className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">Manage users and admin roles</p>
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
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ShieldCheck className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Subscribed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.subscribedUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCredits}</p>
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="admin">Admin Users</option>
                <option value="regular">Regular Users</option>
                <option value="subscribed">Subscribed Users</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_admin
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_admin ? (
                        <>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          User
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.credits || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.subscription_status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.subscription_status === 'active' ? 'Pro' : 'Free'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowRoleModal(true)
                      }}
                      className={`${
                        user.is_admin
                          ? 'text-orange-600 hover:text-orange-900'
                          : 'text-purple-600 hover:text-purple-900'
                      }`}
                    >
                      {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/credits?user=${user.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Manage Credits
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'No users match the selected filter.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Role Change Confirmation Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser.is_admin ? 'Remove Admin Access' : 'Grant Admin Access'}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                {selectedUser.is_admin
                  ? `Are you sure you want to remove admin access from ${selectedUser.email}? They will lose access to all admin features.`
                  : `Are you sure you want to grant admin access to ${selectedUser.email}? They will have full administrative privileges.`
                }
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false)
                    setSelectedUser(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => toggleAdminRole(selectedUser.id, selectedUser.is_admin)}
                  className={`px-4 py-2 text-white rounded-md ${
                    selectedUser.is_admin
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {selectedUser.is_admin ? 'Remove Admin' : 'Grant Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}