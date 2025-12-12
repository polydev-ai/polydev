import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'

// Helper function to check admin access
async function checkAdminAccess(adminClient: any, userId: string, userEmail: string): Promise<boolean> {
  const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com']);
  if (legacyAdminEmails.has(userEmail)) return true;

  try {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    return profile?.is_admin || false;
  } catch (error) {
    return false;
  }
}

export async function GET() {
  try {
    // Authenticate user with SSR client
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Check admin access
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: bonuses, error } = await adminClient
      .from('user_bonus_quotas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bonuses:', error)
      return NextResponse.json({ error: 'Failed to fetch bonuses' }, { status: 500 })
    }

    // Get unique user IDs
    const userIds = [...new Set(bonuses?.map(b => b.user_id).filter(Boolean) || [])]
    const creatorIds = [...new Set(bonuses?.map(b => b.created_by).filter(Boolean) || [])]
    const allUserIds = [...new Set([...userIds, ...creatorIds])]

    // Fetch all profiles
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, email')
      .in('id', allUserIds)

    // Create email lookup map
    const emailMap = new Map((profiles || []).map(p => [p.id, p.email]))

    // Transform bonuses with email lookups
    const transformedBonuses = bonuses?.map(bonus => ({
      ...bonus,
      user_email: emailMap.get(bonus.user_id) || 'Unknown',
      created_by_email: bonus.created_by ? (emailMap.get(bonus.created_by) || 'System') : 'System'
    }))

    return NextResponse.json({ bonuses: transformedBonuses })
  } catch (error) {
    console.error('Error in bonuses list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
