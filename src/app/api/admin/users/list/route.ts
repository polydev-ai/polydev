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

    // Use admin client to fetch users (bypasses RLS)
    const adminClient = createAdminClient()

    const { data: users, error } = await adminClient
      .from('profiles')
      .select('id, email')
      .order('email')

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in users list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
