import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes } from 'crypto'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Test authentication first
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'authentication_failed',
        details: { userError, user: user ? { id: user.id, email: user.email } : null }
      })
    }
    
    // Try to insert a test auth code
    const testCode = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 600000)
    
    const { data, error: insertError } = await supabase
      .from('mcp_auth_codes')
      .insert({
        code: testCode,
        client_id: 'test-client',
        user_id: user.id,
        redirect_uri: 'http://localhost:3000/test',
        state: 'test-state',
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
    
    if (insertError) {
      return NextResponse.json({
        error: 'insert_failed',
        details: insertError,
        user_context: { id: user.id, email: user.email }
      })
    }
    
    // Try to retrieve it back
    const { data: retrieved, error: selectError } = await supabase
      .from('mcp_auth_codes')
      .select('*')
      .eq('code', testCode)
      .single()
    
    // Clean up test data
    await supabase
      .from('mcp_auth_codes')
      .delete()
      .eq('code', testCode)
    
    return NextResponse.json({
      success: true,
      insert_result: data,
      retrieve_result: retrieved,
      select_error: selectError,
      user: { id: user.id, email: user.email }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'exception',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}