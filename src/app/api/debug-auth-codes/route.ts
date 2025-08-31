import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get recent auth codes
    const { data: codes, error } = await supabase
      .from('mcp_auth_codes')
      .select('code, client_id, created_at, used, expires_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Also get count of all codes
    const { count, error: countError } = await supabase
      .from('mcp_auth_codes')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      recent_codes: codes?.map(code => ({
        ...code,
        code: code.code.substring(0, 10) + '...' // Truncate for security
      })) || [],
      total_count: count,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}