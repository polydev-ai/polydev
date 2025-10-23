import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { bonusManager } from '@/lib/bonus-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('tier')
      .eq('user_id', user.id)
      .single()

    if (profileError || profile?.tier !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { bonusId } = body

    if (!bonusId) {
      return NextResponse.json(
        { error: 'Missing bonus ID' },
        { status: 400 }
      )
    }

    // Delete the bonus
    const success = await bonusManager.deleteBonus(bonusId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete bonus' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error in delete bonus API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}