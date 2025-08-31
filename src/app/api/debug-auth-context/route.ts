import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG AUTH CONTEXT] Starting authentication context test')
    
    const supabase = await createClient()
    
    // Get user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('[DEBUG AUTH CONTEXT] User check:', { 
      user: user ? { id: user.id, email: user.email, aud: user.aud, role: user.role } : null, 
      userError: userError ? { name: userError.name, message: userError.message } : null 
    })
    
    // Get session info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('[DEBUG AUTH CONTEXT] Session check:', { 
      session: session ? { 
        user: { id: session.user.id, email: session.user.email }, 
        access_token: session.access_token?.substring(0, 20) + '...', 
        token_type: session.token_type 
      } : null, 
      sessionError: sessionError ? { name: sessionError.name, message: sessionError.message } : null 
    })
    
    // Test RLS context with a simple query
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    console.log('[DEBUG AUTH CONTEXT] Profile test (RLS check):', { profileTest, profileError })
    
    // Test auth.uid() function directly
    const { data: authUidTest, error: authUidError } = await supabase
      .rpc('get_auth_uid')
      .single()
    
    console.log('[DEBUG AUTH CONTEXT] auth.uid() test:', { authUidTest, authUidError })
    
    return NextResponse.json({
      success: true,
      context: {
        user: user ? { id: user.id, email: user.email, aud: user.aud, role: user.role } : null,
        session: session ? { 
          user_id: session.user.id, 
          token_type: session.token_type,
          expires_at: session.expires_at 
        } : null,
        profile_test: { data: profileTest, error: profileError },
        auth_uid_test: { data: authUidTest, error: authUidError },
        errors: { userError, sessionError, profileError, authUidError }
      }
    })
    
  } catch (error) {
    console.error('[DEBUG AUTH CONTEXT] Exception:', error)
    return NextResponse.json({ 
      error: 'exception',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}