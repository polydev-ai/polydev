import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test basic connection
    console.log('Testing database connection...')
    
    // Test if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['mcp_user_tokens', 'user_preferences'])
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError)
      return NextResponse.json({ 
        error: 'Failed to check tables',
        details: tablesError.message 
      }, { status: 500 })
    }
    
    console.log('Tables found:', tables?.map(t => t.table_name))
    
    // Test authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    return NextResponse.json({
      status: 'Database connection successful',
      tables: tables?.map(t => t.table_name) || [],
      user_authenticated: !!user,
      user_id: user?.id || null,
      auth_error: userError?.message || null
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}