import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription data
    const subscription = await subscriptionManager.getUserSubscription(user.id)
    const messageUsage = await subscriptionManager.getUserMessageUsage(user.id)
    const actualMessageCount = await subscriptionManager.getActualMessageCount(user.id, true)
    const userCredits = await subscriptionManager.getUserCredits(user.id, true)

    // Calculate remaining messages
    const messagesUsed = actualMessageCount.totalMessages
    const messagesLimit = messageUsage?.messages_limit || 1000
    const messagesRemaining = Math.max(0, messagesLimit - messagesUsed)

    return NextResponse.json({
      subscription,
      messageUsage: {
        ...messageUsage,
        // Override with actual count for display consistency across pages
        actual_messages_sent: messagesUsed,
        messages_remaining: messagesRemaining,
        breakdown: {
          chat_messages: actualMessageCount.chatMessages,
          mcp_calls: actualMessageCount.mcpCalls
        },
        // All-time counts for display
        allTime: {
          total_messages: actualMessageCount.allTimeTotalMessages,
          chat_messages: actualMessageCount.allTimeChatMessages,
          mcp_calls: actualMessageCount.allTimeMcpCalls
        }
      },
      credits: userCredits ? {
        balance: parseFloat(userCredits.balance?.toString() || '0'),
        promotional_balance: parseFloat(userCredits.promotional_balance?.toString() || '0'),
        total_available: parseFloat(userCredits.balance?.toString() || '0') + parseFloat(userCredits.promotional_balance?.toString() || '0'),
        monthly_allocation: parseFloat(userCredits.monthly_allocation?.toString() || '0'),
        total_spent: parseFloat(userCredits.total_spent?.toString() || '0'),
        total_purchased: parseFloat(userCredits.total_purchased?.toString() || '0')
      } : null
    })

  } catch (error) {
    console.error('[Subscription API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}