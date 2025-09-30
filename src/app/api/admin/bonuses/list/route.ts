import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '../../../../utils/supabase/server'

export async function GET() {
  try {
    // Authenticate user with SSR client
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to fetch bonuses with user emails (bypasses RLS)
    const adminClient = createAdminClient()

    const { data: bonuses, error } = await adminClient
      .from('user_bonus_quotas')
      .select(`
        *,
        user:profiles!user_bonus_quotas_user_id_fkey(email),
        creator:profiles!user_bonus_quotas_created_by_fkey(email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bonuses:', error)
      return NextResponse.json({ error: 'Failed to fetch bonuses' }, { status: 500 })
    }

    // Transform the data to flatten user info
    const transformedBonuses = bonuses?.map(bonus => ({
      ...bonus,
      user_email: (bonus.user as any)?.email || 'Unknown',
      created_by_email: (bonus.creator as any)?.email || 'System'
    }))

    return NextResponse.json({ bonuses: transformedBonuses })
  } catch (error) {
    console.error('Error in bonuses list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
