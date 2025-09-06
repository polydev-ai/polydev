import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: apiKeys, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }
    
    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error('Error in GET /api/api-keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { provider, api_key, key_name, api_base, default_model, is_preferred = false, additional_models = [], budget_limit = null } = await request.json()
    
    // Validate required fields
    if (!provider || !api_key) {
      return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
    }
    
    // Encrypt the API key (in production, use proper encryption)
    const encryptedKey = btoa(api_key)
    const keyPreview = api_key.length > 8 
      ? `${api_key.slice(0, 8)}...${api_key.slice(-4)}`
      : `${api_key.slice(0, 4)}***`
    
    const keyData = {
      user_id: user.id,
      provider,
      key_name: key_name || `${provider} Key`,
      encrypted_key: encryptedKey,
      key_preview: keyPreview,
      api_base: api_base || null,
      default_model: default_model || null,
      additional_models: additional_models,
      is_preferred,
      budget_limit,
      active: true
    }
    
    const { data: newApiKey, error } = await supabase
      .from('user_api_keys')
      .insert(keyData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }
    
    // If this is a preferred provider, update user preferences
    if (is_preferred) {
      // Fetch current preferences
      const { data: preferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('model_preferences')
        .eq('user_id', user.id)
        .single()
      
      if (!prefError && preferences) {
        // Update model preferences with new provider structure
        const currentPrefs = preferences.model_preferences || {}
        
        // Get highest order number for new provider
        const orders = Object.values(currentPrefs)
          .filter((pref: any) => pref && typeof pref === 'object' && pref.order)
          .map((pref: any) => pref.order)
        const maxOrder = orders.length > 0 ? Math.max(...orders) : 0
        
        // Build models array
        const models = [default_model, ...additional_models].filter(Boolean)
        
        const updatedPrefs = {
          ...currentPrefs,
          [provider]: {
            models,
            order: maxOrder + 1
          }
        }
        
        await supabase
          .from('user_preferences')
          .update({ model_preferences: updatedPrefs })
          .eq('user_id', user.id)
      }
    }
    
    return NextResponse.json({ apiKey: newApiKey })
  } catch (error) {
    console.error('Error in POST /api/api-keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}