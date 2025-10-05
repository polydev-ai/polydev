'use client'

import React from 'react'
import { useCredits } from '../../hooks/useCredits'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { RefreshCw, CreditCard, TrendingUp, AlertTriangle } from 'lucide-react'

interface CreditBalanceCardProps {
  showActions?: boolean
  compact?: boolean
}

export const CreditBalanceCard: React.FC<CreditBalanceCardProps> = ({
  showActions = true,
  compact = false
}) => {
  const { balance, loading, error, refreshBalance, formatCurrency, getCreditStatus } = useCredits()
  const status = getCreditStatus()
  const totalBalance = balance.balance + balance.promotionalBalance

  if (compact) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-slate-50 rounded-lg">
        <CreditCard className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium">
          {loading ? (
            <span className="animate-pulse">Loading...</span>
          ) : error ? (
            <span className="text-slate-900">Error</span>
          ) : (
            <span className={status.color}>
              {formatCurrency(totalBalance)}
            </span>
          )}
        </span>
        {showActions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshBalance}
            disabled={loading}
            className="p-1 h-auto"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
        <div className="flex items-center space-x-2">
          {status.status === 'critical' && (
            <AlertTriangle className="w-4 h-4 text-slate-900" />
          )}
          <CreditCard className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main Balance */}
          <div>
            <div className="flex items-baseline space-x-2">
              <div className={`text-2xl font-bold ${status.color}`}>
                {loading ? (
                  <span className="animate-pulse">---.----</span>
                ) : error ? (
                  <span className="text-slate-900">Error</span>
                ) : (
                  formatCurrency(totalBalance)
                )}
              </div>
              <Badge
                variant={status.status === 'good' ? 'default' : status.status === 'low' ? 'secondary' : 'destructive'}
              >
                {status.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Available for API requests
            </p>
          </div>

          {/* Balance Breakdown */}
          {!loading && !error && (balance.balance > 0 || balance.promotionalBalance > 0) && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {balance.balance > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Purchased</div>
                  <div className="font-medium">{formatCurrency(balance.balance)}</div>
                </div>
              )}
              {balance.promotionalBalance > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Promotional</div>
                  <div className="font-medium text-slate-900">
                    {formatCurrency(balance.promotionalBalance)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Total Spent */}
          {!loading && !error && balance.totalSpent > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Total Spent
                </span>
                <span className="font-medium">{formatCurrency(balance.totalSpent)}</span>
              </div>
            </div>
          )}

          {/* API Key Status */}
          {!loading && !error && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">OpenRouter Key</span>
                <Badge variant={balance.hasOpenRouterKey ? 'default' : 'outline'}>
                  {balance.hasOpenRouterKey ? 'Connected' : 'Not Set'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {balance.hasOpenRouterKey 
                  ? 'Using your personal API key'
                  : 'Using credits fallback system'
                }
              </p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshBalance}
                disabled={loading}
                className="flex-1"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <a href="/dashboard/credits">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Manage
                </a>
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-sm text-slate-900 bg-slate-100 p-2 rounded">
              {error}
            </div>
          )}

          {/* Low Balance Warning */}
          {!loading && !error && status.status === 'critical' && (
            <div className="text-sm text-slate-900 bg-slate-100 p-2 rounded">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Low credit balance
              </div>
              <p className="text-xs mt-1">
                Add credits or connect an API key to avoid interruptions
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CreditBalanceCard