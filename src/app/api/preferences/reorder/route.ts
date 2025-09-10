import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { reorderedPreferences } = await request.json()
    
    // Validate the structure - should be { provider: { models: [], order: number } }
    if (!reorderedPreferences || typeof reorderedPreferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences structure' }, { status: 400 })
    }
    
    // Validate each preference has the correct structure
    for (const [provider, pref] of Object.entries(reorderedPreferences)) {
      if (typeof pref !== 'object' || !Array.isArray((pref as any).models) || typeof (pref as any).order !== 'number') {
        return NextResponse.json({ 
          error: `Invalid preference structure for provider: ${provider}` 
        }, { status: 400 })
      }
    }
    
    const { error } = await supabase
      .from('user_preferences')
      .update({ model_preferences: reorderedPreferences })
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error updating preference order:', error)
      return NextResponse.json({ error: 'Failed to update preference order' }, { status: 500 })
    }
    
    // Sync API key default_model with the first model in each provider's preferences
    for (const [provider, pref] of Object.entries(reorderedPreferences)) {
      const preference = pref as { models: string[], order: number }
      if (preference.models && preference.models.length > 0) {
        const firstModel = preference.models[0]
        
        // Update the API key's default_model for this provider
        const { error: updateError } = await supabase
          .from('user_api_keys')
          .update({ default_model: firstModel })
          .eq('user_id', user.id)
          .eq('provider', provider)
          .eq('active', true)
        
        if (updateError) {
          console.warn(`Failed to sync default_model for provider ${provider}:`, updateError)
          // Don't fail the entire request for sync issues
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/preferences/reorder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}