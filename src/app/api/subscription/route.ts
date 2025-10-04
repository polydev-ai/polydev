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

    return NextResponse.json({
      subscription,
      messageUsage: {
        ...messageUsage,
        // Override with actual count for display consistency across pages
        actual_messages_sent: actualMessageCount.totalMessages,
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
      }
    })

  } catch (error) {
    console.error('[Subscription API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}