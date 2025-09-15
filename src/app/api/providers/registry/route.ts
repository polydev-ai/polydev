import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query providers registry
    const { data: providers, error } = await supabase
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching providers registry:', error)
      return NextResponse.json({ error: 'Failed to fetch providers registry' }, { status: 500 })
    }

    return NextResponse.json({ 
      providers: providers || [],
      meta: {
        total: providers?.length || 0,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Providers registry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}