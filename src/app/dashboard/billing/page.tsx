'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/components/AuthProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BillingItem {
  id: string
  date: string
  amount: number
  currency: string
  description: string
  status: string
  invoice_url?: string
  pdf_url?: string
  credits_purchased?: number
  type?: string
  period_start?: string
  period_end?: string
}

interface Subscription {
  stripe_customer_id: string
  stripe_subscription_id: string
  tier: string
  status: string
}

export default function BillingPage() {
  const { user } = useAuth()
  const [billingHistory, setBillingHistory] = useState<BillingItem[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchBillingHistory()
    }
  }, [user])

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch('/api/billing/history')
      if (!response.ok) throw new Error('Failed to fetch billing history')
      
      const data = await response.json()
      setBillingHistory(data.billing_history || [])
      setSubscription(data.subscription)
    } catch (error) {
      console.error('Error fetching billing history:', error)
      setError('Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async (immediately: boolean = false) => {
    setCancelling(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel subscription')
      }

      const result = await response.json()
      alert(result.message)
      setCancelDialogOpen(false)
      fetchBillingHistory() // Refresh data
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'failed':
      case 'canceled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Billing & Subscriptions</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your subscription and view billing history</p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Subscription */}
      {subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Plan:</span>
                  <Badge variant="default" className="capitalize">{subscription.tier}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  {getStatusBadge(subscription.status)}
                </div>
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => window.open('/api/subscription/portal', '_blank')}
                >
                  Manage Billing
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={subscription.status !== 'active'}
                >
                  Cancel Subscription
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View all your past transactions and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No billing history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {billingHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.description}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(item.date)}
                          </span>
                          {item.period_start && item.period_end && (
                            <span>
                              Billing period: {formatDate(item.period_start)} - {formatDate(item.period_end)}
                            </span>
                          )}
                          {item.credits_purchased && (
                            <span>Credits: {item.credits_purchased}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {formatCurrency(item.amount, item.currency)}
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 space-x-2">
                    {item.invoice_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(item.invoice_url, '_blank')}
                      >
                        View
                      </Button>
                    )}
                    {item.pdf_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(item.pdf_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You can choose to cancel immediately or at the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Keep Subscription
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleCancelSubscription(false)}
              disabled={cancelling}
            >
              {cancelling ? 'Processing...' : 'Cancel at Period End'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleCancelSubscription(true)}
              disabled={cancelling}
            >
              {cancelling ? 'Processing...' : 'Cancel Immediately'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}