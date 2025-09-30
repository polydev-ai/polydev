'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Gift,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BonusQuota {
  id: string
  user_id: string
  bonus_messages: number
  bonus_type: string
  granted_by?: string
  reason?: string
  messages_used: number
  expires_at?: string
  created_at: string
  updated_at: string
  user_email?: string
  granted_by_email?: string
}

interface GrantBonusForm {
  userEmail: string
  bonusMessages: number
  bonusType: 'admin_grant' | 'referral_signup' | 'referral_completion' | 'promotion' | 'other'
  reason: string
  expiresInDays: number
}

export default function AdminBonuses() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bonuses, setBonuses] = useState<BonusQuota[]>([])
  const [filteredBonuses, setFilteredBonuses] = useState<BonusQuota[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [grantForm, setGrantForm] = useState<GrantBonusForm>({
    userEmail: '',
    bonusMessages: 100,
    bonusType: 'admin_grant',
    reason: '',
    expiresInDays: 30
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    loadBonuses()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredBonuses(
        bonuses.filter(bonus =>
          bonus.user_email?.toLowerCase().includes(query) ||
          bonus.bonus_type.toLowerCase().includes(query) ||
          bonus.reason?.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredBonuses(bonuses)
    }
  }, [searchQuery, bonuses])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadBonuses = async () => {
    try {
      // Fetch bonuses
      const { data: bonusData, error } = await supabase
        .from('user_bonus_quotas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get unique user IDs
      const userIds = [...new Set(bonusData?.map(b => b.user_id).filter(Boolean) || [])]
      const granterIds = [...new Set(bonusData?.map(b => b.granted_by).filter(Boolean) || [])]
      const allUserIds = [...new Set([...userIds, ...granterIds])]

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', allUserIds)

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError)
      }

      // Create a map of user IDs to emails
      const userEmailMap = new Map(
        profilesData?.map(p => [p.id, p.email]) || []
      )

      // Process bonuses with email lookups
      const processedBonuses = (bonusData || []).map((bonus: any) => ({
        ...bonus,
        user_email: userEmailMap.get(bonus.user_id) || 'Unknown',
        granted_by_email: bonus.granted_by ? (userEmailMap.get(bonus.granted_by) || 'System') : 'System'
      }))

      setBonuses(processedBonuses)
      setFilteredBonuses(processedBonuses)
    } catch (error) {
      console.error('Error loading bonuses:', error)
      setMessage({ type: 'error', text: 'Failed to load bonuses' })
    }
  }

  const handleGrantBonus = async () => {
    setSaving(true)
    try {
      // Find user by email
      const { data: targetUserData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', grantForm.userEmail)
        .single()

      if (userError || !targetUserData) {
        setMessage({ type: 'error', text: 'User not found' })
        setSaving(false)
        return
      }

      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + grantForm.expiresInDays)

      // Grant bonus via API
      const response = await fetch('/api/admin/bonuses/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserData.id,
          bonusMessages: grantForm.bonusMessages,
          bonusType: grantForm.bonusType,
          grantedBy: user?.id,
          reason: grantForm.reason,
          expiresAt: expiresAt.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to grant bonus')
      }

      setMessage({ type: 'success', text: 'Bonus granted successfully!' })
      setShowGrantDialog(false)
      setGrantForm({
        userEmail: '',
        bonusMessages: 100,
        bonusType: 'admin_grant',
        reason: '',
        expiresInDays: 30
      })
      await loadBonuses()
    } catch (error) {
      console.error('Error granting bonus:', error)
      setMessage({ type: 'error', text: 'Failed to grant bonus' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBonus = async (bonusId: string) => {
    if (!confirm('Are you sure you want to delete this bonus?')) return

    try {
      const response = await fetch('/api/admin/bonuses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bonusId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete bonus')
      }

      setMessage({ type: 'success', text: 'Bonus deleted successfully' })
      await loadBonuses()
    } catch (error) {
      console.error('Error deleting bonus:', error)
      setMessage({ type: 'error', text: 'Failed to delete bonus' })
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isFullyUsed = (bonus: BonusQuota) => {
    return bonus.messages_used >= bonus.bonus_messages
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const activeBonuses = filteredBonuses.filter(b => !isExpired(b.expires_at) && !isFullyUsed(b))
  const expiredBonuses = filteredBonuses.filter(b => isExpired(b.expires_at) || isFullyUsed(b))

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Admin Portal
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="h-8 w-8 text-purple-600" />
              Bonus Quota Management
            </h1>
            <p className="text-gray-600 mt-2">
              Grant and manage bonus message quotas for users
            </p>
          </div>
          <Button onClick={() => setShowGrantDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Grant Bonus
          </Button>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-2 text-sm underline">
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{activeBonuses.length}</div>
              <p className="text-sm text-gray-600">Active Bonuses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{expiredBonuses.length}</div>
              <p className="text-sm text-gray-600">Expired/Used Bonuses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {activeBonuses.reduce((sum, b) => sum + (b.bonus_messages - b.messages_used), 0)}
              </div>
              <p className="text-sm text-gray-600">Total Remaining Messages</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bonus Quotas</CardTitle>
              <div className="flex items-center gap-2 w-1/3">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user, type, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBonuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      No bonuses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBonuses.map((bonus) => (
                    <TableRow key={bonus.id} className={isExpired(bonus.expires_at) || isFullyUsed(bonus) ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{bonus.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{bonus.bonus_type}</Badge>
                      </TableCell>
                      <TableCell>{bonus.bonus_messages}</TableCell>
                      <TableCell>
                        <span className={bonus.messages_used >= bonus.bonus_messages ? 'text-red-600 font-semibold' : ''}>
                          {bonus.messages_used}
                        </span>
                      </TableCell>
                      <TableCell>
                        {bonus.expires_at ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className={isExpired(bonus.expires_at) ? 'text-red-600' : ''}>
                              {formatDate(bonus.expires_at)}
                            </span>
                          </div>
                        ) : (
                          'Never'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{bonus.granted_by_email}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={bonus.reason || ''}>
                        {bonus.reason || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBonus(bonus.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Grant Bonus Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Bonus Messages</DialogTitle>
            <DialogDescription>
              Grant bonus message quota to a user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="userEmail">User Email</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="user@example.com"
                value={grantForm.userEmail}
                onChange={(e) => setGrantForm({ ...grantForm, userEmail: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="bonusMessages">Bonus Messages</Label>
              <Input
                id="bonusMessages"
                type="number"
                min="1"
                value={grantForm.bonusMessages}
                onChange={(e) => setGrantForm({ ...grantForm, bonusMessages: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="bonusType">Bonus Type</Label>
              <Select
                value={grantForm.bonusType}
                onValueChange={(value: any) => setGrantForm({ ...grantForm, bonusType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_grant">Admin Grant</SelectItem>
                  <SelectItem value="referral_signup">Referral Signup</SelectItem>
                  <SelectItem value="referral_completion">Referral Completion</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expiresInDays">Expires In (Days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="1"
                value={grantForm.expiresInDays}
                onChange={(e) => setGrantForm({ ...grantForm, expiresInDays: parseInt(e.target.value) || 30 })}
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                placeholder="e.g., Welcome bonus, compensation, etc."
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGrantBonus} disabled={saving || !grantForm.userEmail}>
              {saving ? 'Granting...' : 'Grant Bonus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}