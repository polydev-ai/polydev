import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check current user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Check if user exists in profiles table
    let profileCheck = null
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      profileCheck = {
        profileExists: !profileError && !!profile,
        profileError: profileError?.message || null,
        profile: profile || null
      }
    }

    // Check RLS policies by trying to query profiles with service role vs regular auth
    let rlsCheck = null
    try {
      // Try with regular auth (current user)
      const { count: regularCount, error: regularError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      rlsCheck = {
        regularAuth: {
          count: regularCount,
          error: regularError?.message || null
        }
      }
    } catch (err) {
      rlsCheck = {
        regularAuth: {
          count: 0,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    // Check if we can create a test profile
    let createTest = null
    if (user) {
      try {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
            avatar_url: user.user_metadata?.avatar_url || null,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          })

        createTest = {
          success: !upsertError,
          error: upsertError?.message || null
        }
      } catch (err) {
        createTest = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      user: {
        authenticated: !!user,
        id: user?.id || null,
        email: user?.email || null,
        role: user?.role || null,
        metadata: user?.user_metadata || null,
        error: userError?.message || null
      },
      profileCheck,
      rlsCheck,
      createTest,
      recommendations: createTest?.success
        ? ['Profile created/updated successfully', 'Try refreshing the admin dashboard']
        : ['No authenticated user found', 'Need to sign in first', 'Check authentication setup']
    })
  } catch (error) {
    console.error('Auth debug error:', error)
    return NextResponse.json({
      error: 'Auth debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}