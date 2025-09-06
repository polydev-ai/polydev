import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { apiKeyIds } = await request.json()
    
    // Validate that apiKeyIds is an array
    if (!Array.isArray(apiKeyIds)) {
      return NextResponse.json({ error: 'API key IDs must be an array' }, { status: 400 })
    }
    
    // Verify all keys belong to the user
    const { data: userKeys, error: fetchError } = await supabase
      .from('user_api_keys')
      .select('id')
      .eq('user_id', user.id)
    
    if (fetchError) {
      console.error('Error fetching user keys:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch user keys' }, { status: 500 })
    }
    
    const userKeyIds = userKeys.map(k => k.id)
    const invalidIds = apiKeyIds.filter(id => !userKeyIds.includes(id))
    
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid API key IDs' }, { status: 403 })
    }
    
    // Update order for each API key
    const updates = apiKeyIds.map((keyId: string, index: number) => 
      supabase
        .from('user_api_keys')
        .update({ display_order: index })
        .eq('id', keyId)
        .eq('user_id', user.id)
    )
    
    const results = await Promise.all(updates)
    
    // Check for errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Error updating API key order:', errors)
      return NextResponse.json({ error: 'Failed to update API key order' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/api-keys/reorder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}