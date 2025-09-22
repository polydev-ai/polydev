'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Plus, Copy, Trash2, Gift, Calendar, Users, Check } from 'lucide-react'

interface CouponCode {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_month'
  discount_value: number
  max_uses: number
  current_uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  created_by: string
}

interface CouponUsage {
  id: string
  coupon_id: string
  user_id: string
  used_at: string
  user?: {
    email: string
  }
  coupon?: CouponCode
}

export default function CouponsManagement() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<CouponCode[]>([])
  const [couponUsages, setCouponUsages] = useState<CouponUsage[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null)
  const [copiedCode, setCopiedCode] = useState('')

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
      // Get coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('admin_coupon_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (!couponsError && couponsData) {
        setCoupons(couponsData)
      } else {
        console.log('Coupon codes table not available yet')
        setCoupons([])
      }

      // Get coupon usage
      const { data: usageData, error: usageError } = await supabase
        .from('admin_coupon_usage')
        .select(`
          *,
          user:profiles(email),
          coupon:admin_coupon_codes(code, description)
        `)
        .order('used_at', { ascending: false })
        .limit(50)

      if (!usageError && usageData) {
        setCouponUsages(usageData)
      } else {
        console.log('Coupon usage table not available yet')
        setCouponUsages([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  async function saveCoupon(couponData: Partial<CouponCode>) {
    try {
      if (editingCoupon?.id) {
        // Update existing coupon
        const { error } = await supabase
          .from('admin_coupon_codes')
          .update(couponData)
          .eq('id', editingCoupon.id)

        if (error) throw error

        await logActivity('update_coupon', `Updated coupon: ${couponData.code}`)
      } else {
        // Create new coupon
        const { error } = await supabase
          .from('admin_coupon_codes')
          .insert([{
            ...couponData,
            created_by: user?.email,
            current_uses: 0
          }])

        if (error) throw error

        await logActivity('create_coupon', `Created new coupon: ${couponData.code}`)
      }

      setShowCreateForm(false)
      setEditingCoupon(null)
      await loadData()
    } catch (error) {
      console.error('Error saving coupon:', error)
      alert('Error saving coupon: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function deleteCoupon(couponId: string) {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('admin_coupon_codes')
        .delete()
        .eq('id', couponId)

      if (error) throw error

      await logActivity('delete_coupon', `Deleted coupon with ID: ${couponId}`)
      await loadData()
    } catch (error) {
      console.error('Error deleting coupon:', error)
      alert('Error deleting coupon: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function toggleCouponStatus(couponId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('admin_coupon_codes')
        .update({ is_active: !currentStatus })
        .eq('id', couponId)

      if (error) throw error

      await logActivity('toggle_coupon_status', `${!currentStatus ? 'Activated' : 'Deactivated'} coupon: ${couponId}`)
      await loadData()
    } catch (error) {
      console.error('Error toggling coupon status:', error)
      alert('Error updating coupon status: ' + (error instanceof Error ? error.message : 'Unknown error'))
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

  function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedCode(text)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  const activeCoupons = coupons.filter(c => c.is_active)
  const totalUses = coupons.reduce((sum, c) => sum + c.current_uses, 0)
  const expiredCoupons = coupons.filter(c => c.expires_at && new Date(c.expires_at) < new Date())

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
                <h1 className="text-3xl font-bold text-gray-900">Coupon Codes</h1>
                <p className="text-gray-600 mt-1">Manage subscription coupon codes</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingCoupon(null)
                setShowCreateForm(true)
              }}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Coupons</p>
                <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Check className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Coupons</p>
                <p className="text-2xl font-bold text-gray-900">{activeCoupons.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Uses</p>
                <p className="text-2xl font-bold text-gray-900">{totalUses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">{expiredCoupons.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coupons List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Coupon Codes</h2>
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
              <div className="space-y-4 p-6">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
                  const usagePercentage = coupon.max_uses > 0 ? (coupon.current_uses / coupon.max_uses) * 100 : 0

                  return (
                    <div key={coupon.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 font-mono">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(coupon.code)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-sm text-gray-900 font-medium mb-1">{coupon.description}</p>

                          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                            <span>
                              {coupon.discount_type === 'percentage' && `${coupon.discount_value}% off`}
                              {coupon.discount_type === 'fixed_amount' && `$${coupon.discount_value} off`}
                              {coupon.discount_type === 'free_month' && 'Free month'}
                            </span>
                            <span>Uses: {coupon.current_uses}/{coupon.max_uses === 0 ? '∞' : coupon.max_uses}</span>
                            {coupon.expires_at && (
                              <span className={isExpired ? 'text-red-600' : ''}>
                                Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {coupon.max_uses > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div
                                className={`h-2 rounded-full ${
                                  usagePercentage >= 100 ? 'bg-red-600' :
                                  usagePercentage >= 80 ? 'bg-orange-600' : 'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                              ></div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              coupon.is_active && !isExpired
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {coupon.is_active && !isExpired ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingCoupon(coupon)
                              setShowCreateForm(true)
                            }}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                            className={`text-sm ${
                              coupon.is_active ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {coupon.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {coupons.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No coupon codes created yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Usage */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Usage</h2>
            <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto p-6">
                <div className="space-y-3">
                  {couponUsages.map((usage) => (
                    <div key={usage.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                      <Gift className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {usage.coupon?.code || 'Unknown Coupon'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Used by {usage.user?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(usage.used_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {couponUsages.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No coupon usage yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Form Modal */}
      {showCreateForm && (
        <CouponForm
          coupon={editingCoupon}
          onSave={saveCoupon}
          onCancel={() => {
            setShowCreateForm(false)
            setEditingCoupon(null)
          }}
          generateCode={generateCouponCode}
        />
      )}
    </div>
  )
}

// Coupon Form Component
function CouponForm({ coupon, onSave, onCancel, generateCode }: {
  coupon: CouponCode | null
  onSave: (coupon: Partial<CouponCode>) => void
  onCancel: () => void
  generateCode: () => string
}) {
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'free_month' as 'percentage' | 'fixed_amount' | 'free_month',
    discount_value: coupon?.discount_value || 0,
    max_uses: coupon?.max_uses || 100,
    expires_at: coupon?.expires_at ? coupon.expires_at.split('T')[0] : '',
    is_active: coupon?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {coupon ? 'Edit Coupon' : 'Create New Coupon'}
            </h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  placeholder="SAVE50"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, code: generateCode() }))}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="50% off first month"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    discount_type: e.target.value as 'percentage' | 'fixed_amount' | 'free_month',
                    discount_value: e.target.value === 'free_month' ? 1 : prev.discount_value
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="free_month">Free Month</option>
                  <option value="percentage">Percentage Off</option>
                  <option value="fixed_amount">Fixed Amount Off</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.discount_type === 'percentage' ? 'Percentage (%)' :
                   formData.discount_type === 'fixed_amount' ? 'Amount ($)' : 'Value'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={formData.discount_type === 'free_month'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (0 = unlimited)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_uses}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="mr-2"
                />
                Active
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {coupon ? 'Update' : 'Create'} Coupon
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}