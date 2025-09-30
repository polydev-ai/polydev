import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { bonusManager } from '@/lib/bonus-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, bonusMessages, bonusType, grantedBy, reason, expiresAt } = body

    if (!userId || !bonusMessages || !bonusType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Grant the bonus
    const bonus = await bonusManager.grantBonus({
      userId,
      bonusMessages,
      bonusType,
      grantedBy,
      reason,
      expiresAt
    })

    if (!bonus) {
      return NextResponse.json(
        { error: 'Failed to grant bonus' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bonus
    })
  } catch (error) {
    console.error('Error in grant bonus API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}