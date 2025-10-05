'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Calendar,
  User as UserIcon
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BonusQuota {
  id: string
  user_id: string
  bonus_type: string
  messages: number
  premium_perspectives: number
  normal_perspectives: number
  eco_perspectives: number
  expires_at?: string
  is_expired: boolean
  created_at: string
  created_by?: string
  notes?: string
  user_email?: string
  created_by_email?: string
}

interface UserProfile {
  id: string
  email: string
}

interface GrantBonusForm {
  userId: string
  bonusType: 'admin_bonus' | 'referral_bonus'
  messages: number
  premiumPerspectives: number
  normalPerspectives: number
  ecoPerspectives: number
  notes: string
  expiresInDays: number
}

export default function AdminBonuses() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bonuses, setBonuses] = useState<BonusQuota[]>([])
  const [filteredBonuses, setFilteredBonuses] = useState<BonusQuota[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [grantForm, setGrantForm] = useState<GrantBonusForm>({
    userId: '',
    bonusType: 'admin_bonus',
    messages: 800,
    premiumPerspectives: 0,
    normalPerspectives: 0,
    ecoPerspectives: 0,
    notes: '',
    expiresInDays: 30
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    loadUsers()
    loadBonuses()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      setFilteredBonuses(
        bonuses.filter(bonus =>
          bonus.user_email?.toLowerCase().includes(query) ||
          bonus.bonus_type.toLowerCase().includes(query) ||
          bonus.notes?.toLowerCase().includes(query)
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

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/list')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load users')
      }

      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setMessage({ type: 'error', text: 'Failed to load users' })
    }
  }

  const loadBonuses = async () => {
    try {
      const response = await fetch('/api/admin/bonuses/list')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load bonuses')
      }

      setBonuses(data.bonuses || [])
      setFilteredBonuses(data.bonuses || [])
    } catch (error) {
      console.error('Error loading bonuses:', error)
      setMessage({ type: 'error', text: 'Failed to load bonuses' })
    }
  }

  const handleGrantBonus = async () => {
    if (!grantForm.userId) {
      setMessage({ type: 'error', text: 'Please select a user' })
      return
    }

    setSaving(true)
    try {
      const expiresAt = grantForm.expiresInDays > 0
        ? new Date(Date.now() + grantForm.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      // Check if "All Users" is selected
      const targetUserIds = grantForm.userId === 'ALL_USERS'
        ? users.map(u => u.id)
        : [grantForm.userId]

      // Create bonus records for all target users
      const bonusRecords = targetUserIds.map(userId => ({
        user_id: userId,
        bonus_type: grantForm.bonusType,
        messages: grantForm.messages,
        premium_perspectives: grantForm.premiumPerspectives,
        normal_perspectives: grantForm.normalPerspectives,
        eco_perspectives: grantForm.ecoPerspectives,
        expires_at: expiresAt,
        is_expired: false,
        created_by: user?.id,
        notes: grantForm.notes || null
      }))

      const { error } = await supabase
        .from('user_bonus_quotas')
        .insert(bonusRecords)

      if (error) throw error

      const successMessage = grantForm.userId === 'ALL_USERS'
        ? `Bonus granted successfully to all ${targetUserIds.length} users!`
        : 'Bonus granted successfully!'

      setMessage({ type: 'success', text: successMessage })
      setShowGrantDialog(false)
      resetForm()
      loadBonuses()
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
      const { error } = await supabase
        .from('user_bonus_quotas')
        .delete()
        .eq('id', bonusId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Bonus deleted successfully!' })
      loadBonuses()
    } catch (error) {
      console.error('Error deleting bonus:', error)
      setMessage({ type: 'error', text: 'Failed to delete bonus' })
    }
  }

  const resetForm = () => {
    setGrantForm({
      userId: '',
      bonusType: 'admin_bonus',
      messages: 800,
      premiumPerspectives: 0,
      normalPerspectives: 0,
      ecoPerspectives: 0,
      notes: '',
      expiresInDays: 30
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getBonusTypeColor = (type: string) => {
    return 'bg-slate-100 text-slate-900 border border-slate-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const totalBonuses = bonuses.length
  const totalMessages = bonuses.reduce((sum, b) => sum + b.messages, 0)
  const activeBonuses = bonuses.filter(b => !b.is_expired).length

  return (
    <div className="min-h-screen bg-slate-50 py-8">
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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Gift className="h-8 w-8 text-slate-900" />
              Bonus Quotas Management
            </h1>
            <p className="text-slate-600 mt-2">
              Grant and manage bonus messages and perspectives for users
            </p>
          </div>
          <Button onClick={() => setShowGrantDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Grant Bonus
          </Button>
        </div>

        {message && (
          <Alert className={`mb-6 border-slate-200`}>
            <CheckCircle className="h-4 w-4 text-slate-900" />
            <AlertDescription className="text-slate-900">
              {message.text}
              <button
                onClick={() => setMessage(null)}
                className="ml-2 text-sm underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Bonuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBonuses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Active Bonuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{activeBonuses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Messages Granted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{totalMessages.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
              <Input
                placeholder="Search by user email, bonus type, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bonuses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bonus Quotas ({filteredBonuses.length})</CardTitle>
            <CardDescription>
              {filteredBonuses.length === 0 ? 'No bonuses found. Grant bonuses to users to get started.' : 'All granted bonuses and their status'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredBonuses.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No bonuses have been granted yet</p>
                <Button onClick={() => setShowGrantDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Grant First Bonus
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Normal</TableHead>
                      <TableHead>Eco</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Granted By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBonuses.map((bonus) => (
                      <TableRow key={bonus.id}>
                        <TableCell className="font-medium">{bonus.user_email}</TableCell>
                        <TableCell>
                          <Badge className={getBonusTypeColor(bonus.bonus_type)}>
                            {bonus.bonus_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{bonus.messages.toLocaleString()}</TableCell>
                        <TableCell>{bonus.premium_perspectives}</TableCell>
                        <TableCell>{bonus.normal_perspectives}</TableCell>
                        <TableCell>{bonus.eco_perspectives}</TableCell>
                        <TableCell>
                          {bonus.expires_at ? (
                            <span className="text-sm">{formatDate(bonus.expires_at)}</span>
                          ) : (
                            <span className="text-slate-600 text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bonus.is_expired ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-900 border border-slate-200">Expired</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-900 border border-slate-200">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{bonus.created_by_email}</TableCell>
                        <TableCell className="text-sm text-slate-600">{formatDate(bonus.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBonus(bonus.id)}
                          >
                            <Trash2 className="h-4 w-4 text-slate-900" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grant Bonus Dialog */}
        <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col fixed top-[5vh] translate-y-0">
            <DialogHeader className="flex-shrink-0 pb-4 border-b">
              <DialogTitle>Grant Bonus Quota</DialogTitle>
              <DialogDescription>
                Grant bonus messages and perspectives to a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto flex-1 px-1 min-h-0">
              <div className="space-y-2">
                <Label htmlFor="user">User *</Label>
                <Select value={grantForm.userId} onValueChange={(value) => setGrantForm({ ...grantForm, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" className="max-h-[200px] overflow-y-auto z-[9999] bg-white border shadow-lg" sideOffset={8}>
                    <SelectItem value="ALL_USERS">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <UserIcon className="h-4 w-4" />
                        <span>All Users ({users.length})</span>
                      </div>
                    </SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus-type">Bonus Type *</Label>
                <Select value={grantForm.bonusType} onValueChange={(value: any) => setGrantForm({ ...grantForm, bonusType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" className="z-[9999] bg-white border shadow-lg" sideOffset={8}>
                    <SelectItem value="admin_bonus">Admin Bonus</SelectItem>
                    <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="messages">Messages *</Label>
                  <Input
                    id="messages"
                    type="number"
                    value={grantForm.messages}
                    onChange={(e) => setGrantForm({ ...grantForm, messages: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires In (Days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={grantForm.expiresInDays}
                    onChange={(e) => setGrantForm({ ...grantForm, expiresInDays: parseInt(e.target.value) || 0 })}
                    placeholder="0 = Never"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="premium">Premium Perspectives</Label>
                  <Input
                    id="premium"
                    type="number"
                    value={grantForm.premiumPerspectives}
                    onChange={(e) => setGrantForm({ ...grantForm, premiumPerspectives: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="normal">Normal Perspectives</Label>
                  <Input
                    id="normal"
                    type="number"
                    value={grantForm.normalPerspectives}
                    onChange={(e) => setGrantForm({ ...grantForm, normalPerspectives: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eco">Eco Perspectives</Label>
                  <Input
                    id="eco"
                    type="number"
                    value={grantForm.ecoPerspectives}
                    onChange={(e) => setGrantForm({ ...grantForm, ecoPerspectives: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={grantForm.notes}
                  onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                  placeholder="Reason for granting bonus..."
                />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowGrantDialog(false)
                resetForm()
              }}>Cancel</Button>
              <Button onClick={handleGrantBonus} disabled={saving}>
                {saving ? 'Granting...' : 'Grant Bonus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
