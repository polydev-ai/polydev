import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes } from 'crypto'

export async function POST() {
  try {
    const supabase = await createClient()
    
    console.log('[DEBUG] Starting auth insert test')
    
    // Test authentication first
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('[DEBUG] User check result:', { 
      user: user ? { id: user.id, email: user.email, aud: user.aud } : null, 
      userError: userError ? { name: userError.name, message: userError.message } : null 
    })
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'authentication_failed',
        details: { userError, user: user ? { id: user.id, email: user.email } : null }
      })
    }
    
    // Test what auth.uid() returns by doing a simple query
    const { data: authTest, error: authTestError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    console.log('[DEBUG] Auth context test:', { authTest, authTestError })
    
    // Try to insert a test auth code
    const testCode = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 600000)
    
    console.log('[DEBUG] Attempting insert with data:', {
      code: testCode.substring(0, 10) + '...',
      client_id: 'debug-client',
      user_id: user.id,
      redirect_uri: 'http://localhost:3000/debug',
      expires_at: expiresAt.toISOString()
    })
    
    const { data: insertData, error: insertError } = await supabase
      .from('mcp_auth_codes')
      .insert({
        code: testCode,
        client_id: 'debug-client', 
        user_id: user.id,
        redirect_uri: 'http://localhost:3000/debug',
        state: 'debug-state',
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
    
    console.log('[DEBUG] Insert result:', { insertData, insertError })
    
    if (insertError) {
      return NextResponse.json({
        error: 'insert_failed',
        details: {
          insertError,
          user_context: { id: user.id, email: user.email },
          auth_test: authTest
        }
      })
    }
    
    // Try to retrieve it back
    const { data: retrieved, error: selectError } = await supabase
      .from('mcp_auth_codes')
      .select('*')
      .eq('code', testCode)
      .single()
    
    console.log('[DEBUG] Retrieve result:', { retrieved, selectError })
    
    // Clean up test data
    const { error: deleteError } = await supabase
      .from('mcp_auth_codes')
      .delete()
      .eq('code', testCode)
    
    console.log('[DEBUG] Cleanup result:', { deleteError })
    
    return NextResponse.json({
      success: true,
      test_results: {
        user: { id: user.id, email: user.email },
        auth_test: authTest,
        insert_data: insertData,
        retrieved_data: retrieved,
        all_errors: { authTestError, insertError, selectError, deleteError }
      }
    })
    
  } catch (error) {
    console.error('[DEBUG] Exception:', error)
    return NextResponse.json({ 
      error: 'exception',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}