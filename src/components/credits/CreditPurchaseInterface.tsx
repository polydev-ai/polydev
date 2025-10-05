'use client'

import React, { useState } from 'react'
import { useCredits } from '../../hooks/useCredits'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { CreditCard, Gift, Star, Zap, DollarSign, Check } from 'lucide-react'
import { toast } from 'sonner'

interface CreditPurchaseInterfaceProps {
  onPurchaseComplete?: () => void
}

export const CreditPurchaseInterface: React.FC<CreditPurchaseInterfaceProps> = ({
  onPurchaseComplete
}) => {
  const { purchaseCredits, loading, purchaseOptions, formatCurrency } = useCredits()
  const [selectedAmount, setSelectedAmount] = useState<number>(10)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'quick' | 'custom'>('quick')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePurchase = async (amount: number) => {
    try {
      setIsProcessing(true)
      const result = await purchaseCredits(amount)
      
      toast.success(`Successfully purchased ${formatCurrency(amount)} in credits!`, {
        description: `Your new balance will be updated shortly.`,
        duration: 5000
      })
      
      // Trigger balance refresh event
      window.dispatchEvent(new CustomEvent('creditBalanceUpdated'))
      
      if (onPurchaseComplete) {
        onPurchaseComplete()
      }
    } catch (error) {
      toast.error('Purchase failed', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 5000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCustomPurchase = async () => {
    const amount = parseFloat(customAmount)
    if (isNaN(amount) || amount < 1) {
      toast.error('Invalid amount', {
        description: 'Please enter a valid amount of at least $1.00'
      })
      return
    }
    if (amount > 1000) {
      toast.error('Amount too large', {
        description: 'Maximum purchase amount is $1000.00'
      })
      return
    }
    await handlePurchase(amount)
  }

  const getPopularOption = () => {
    return purchaseOptions.find(option => option.popular)
  }

  const calculateTotal = (option: typeof purchaseOptions[0]) => {
    return option.amount + option.bonus
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Purchase Credits</h2>
        <p className="text-muted-foreground">
          Add credits to your account for AI model API usage
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Quick Purchase
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Custom Amount
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchaseOptions.map((option) => (
              <Card
                key={option.amount}
                className={`cursor-pointer transition-all ${
                  selectedAmount === option.amount
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-slate-300'
                } ${option.popular ? 'relative overflow-hidden' : ''}`}
                onClick={() => setSelectedAmount(option.amount)}
              >
                {option.popular && (
                  <div className="absolute -right-8 top-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-8 py-1 text-xs font-medium transform rotate-45">
                    <Star className="w-3 h-3 inline mr-1" />
                    POPULAR
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center items-baseline space-x-1">
                    <span className="text-2xl font-bold">
                      {formatCurrency(option.amount)}
                    </span>
                    {option.bonus > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{formatCurrency(option.bonus)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {option.bonus > 0 
                      ? `${formatCurrency(calculateTotal(option))} total value`
                      : 'Base amount'
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  {option.bonus > 0 && (
                    <div className="flex items-center justify-center text-slate-900 text-sm mb-2">
                      <Gift className="w-4 h-4 mr-1" />
                      {formatCurrency(option.bonus)} bonus
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>≈ {Math.round(calculateTotal(option) * 1000)} API calls</div>
                    <div>Price: {formatCurrency(option.price)}</div>
                  </div>
                  
                  {selectedAmount === option.amount && (
                    <div className="mt-3">
                      <Check className="w-5 h-5 text-primary mx-auto" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => handlePurchase(selectedAmount)}
              disabled={loading || isProcessing}
              className="min-w-48"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isProcessing 
                ? 'Processing...' 
                : `Purchase ${formatCurrency(selectedAmount)}`
              }
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Custom Amount
              </CardTitle>
              <CardDescription>
                Enter any amount between $1.00 and $1000.00
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="custom-amount"
                    type="number"
                    min="1"
                    max="1000"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
                {customAmount && !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) >= 1 && (
                  <div className="text-sm text-muted-foreground">
                    ≈ {Math.round(parseFloat(customAmount) * 1000)} API calls
                  </div>
                )}
              </div>

              <Button
                size="lg"
                onClick={handleCustomPurchase}
                disabled={
                  loading || 
                  isProcessing || 
                  !customAmount || 
                  isNaN(parseFloat(customAmount)) || 
                  parseFloat(customAmount) < 1 ||
                  parseFloat(customAmount) > 1000
                }
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {isProcessing 
                  ? 'Processing...' 
                  : customAmount && !isNaN(parseFloat(customAmount)) 
                    ? `Purchase ${formatCurrency(parseFloat(customAmount))}`
                    : 'Purchase Credits'
                }
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium flex items-center">
          <CreditCard className="w-4 h-4 mr-2" />
          Payment Information
        </h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Credits are used for AI model API requests when no personal API key is provided</p>
          <p>• Unused credits never expire and carry over month to month</p>
          <p>• Secure payment processing via Stripe</p>
          <p>• Instant credit delivery to your account</p>
        </div>
      </div>

      {getPopularOption() && (
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Most users choose the {formatCurrency(getPopularOption()!.amount)} option for best value
          </p>
        </div>
      )}
    </div>
  )
}

export default CreditPurchaseInterface