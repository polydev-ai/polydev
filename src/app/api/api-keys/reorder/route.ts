import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { reorderedKeys } = await request.json()
    
    // Validate the structure - should be an array of { id, display_order }
    if (!Array.isArray(reorderedKeys)) {
      return NextResponse.json({ error: 'Invalid reordered keys structure' }, { status: 400 })
    }
    
    // Validate each item has the correct structure
    for (const item of reorderedKeys) {
      if (!item.id || typeof item.display_order !== 'number') {
        return NextResponse.json({ 
          error: 'Invalid key order structure - each item must have id and display_order' 
        }, { status: 400 })
      }
    }
    
    // Update each API key's display order
    const updatePromises = reorderedKeys.map(async (item) => {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
        .eq('user_id', user.id) // Security check - only update user's own keys
      
      if (error) throw error
    })
    
    await Promise.all(updatePromises)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/api-keys/reorder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}