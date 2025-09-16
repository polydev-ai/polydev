import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface CreditBalance {
  balance: number
  totalSpent: number
  promotionalBalance: number
  hasOpenRouterKey: boolean
  lastUpdated: string
}

export interface CreditUsage {
  id: string
  modelName: string
  tokensUsed: number
  cost: number
  createdAt: string
  provider: string
  sessionType: string
}

export interface CreditPurchaseOption {
  amount: number
  price: number
  bonus: number
  popular?: boolean
}

export const useCredits = () => {
  const { user } = useAuth()
  const [balance, setBalance] = useState<CreditBalance>({
    balance: 0,
    totalSpent: 0,
    promotionalBalance: 0,
    hasOpenRouterKey: false,
    lastUpdated: new Date().toISOString()
  })
  const [usage, setUsage] = useState<CreditUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBalance = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/credits/balance', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load balance: ${response.statusText}`)
      }

      const data = await response.json()
      setBalance({
        balance: data.balance || 0,
        totalSpent: data.totalSpent || 0,
        promotionalBalance: data.promotional_balance || 0,
        hasOpenRouterKey: data.hasOpenRouterKey || false,
        lastUpdated: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error loading credit balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to load balance')
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadUsage = useCallback(async (days: number = 30) => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/credits/usage?days=${days}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to load usage: ${response.statusText}`)
      }

      const data = await response.json()
      setUsage(data.usage || [])
    } catch (err) {
      console.error('Error loading credit usage:', err)
      setError(err instanceof Error ? err.message : 'Failed to load usage')
    } finally {
      setLoading(false)
    }
  }, [user])

  const purchaseCredits = useCallback(async (amount: number) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ amount })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Purchase failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Refresh balance after successful purchase
      await loadBalance()
      
      return result
    } catch (err) {
      console.error('Error purchasing credits:', err)
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, loadBalance])

  const setBudget = useCallback(async (monthlyLimit: number) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/credits/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ monthlyLimit })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Budget update failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      console.error('Error setting budget:', err)
      const errorMessage = err instanceof Error ? err.message : 'Budget update failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Auto-refresh balance every 30 seconds when component is active
  useEffect(() => {
    if (!user) return

    loadBalance()
    const interval = setInterval(loadBalance, 30000)
    
    return () => clearInterval(interval)
  }, [user, loadBalance])

  // Listen for credit updates from other components
  useEffect(() => {
    const handleCreditUpdate = () => {
      loadBalance()
    }

    window.addEventListener('creditBalanceUpdated', handleCreditUpdate)
    return () => window.removeEventListener('creditBalanceUpdated', handleCreditUpdate)
  }, [loadBalance])

  const refreshBalance = useCallback(() => {
    return loadBalance()
  }, [loadBalance])

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount)
  }, [])

  const getCreditStatus = useCallback(() => {
    const totalBalance = balance.balance + balance.promotionalBalance
    
    if (totalBalance > 5) return { status: 'good', color: 'text-green-600' }
    if (totalBalance > 1) return { status: 'low', color: 'text-yellow-600' }
    return { status: 'critical', color: 'text-red-600' }
  }, [balance])

  const purchaseOptions: CreditPurchaseOption[] = [
    { amount: 5, price: 5, bonus: 0 },
    { amount: 10, price: 10, bonus: 1, popular: true },
    { amount: 25, price: 25, bonus: 3 },
    { amount: 50, price: 50, bonus: 7 },
    { amount: 100, price: 100, bonus: 15 }
  ]

  return {
    balance,
    usage,
    loading,
    error,
    loadBalance,
    loadUsage,
    purchaseCredits,
    setBudget,
    refreshBalance,
    formatCurrency,
    getCreditStatus,
    purchaseOptions
  }
}