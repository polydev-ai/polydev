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
      .neq('is_admin_key', true) // Only fetch user's personal keys (exclude admin keys)
      .order('display_order', { ascending: true, nullsFirst: false })
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
    
    const { provider, api_key, key_name, api_base, default_model, is_preferred = false, is_primary = false, monthly_budget = null } = await request.json()

    // Validate required fields - API key is now optional
    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    // If marking as primary, unset other primary keys for this user+provider
    if (is_primary) {
      await supabase
        .from('user_api_keys')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('is_primary', true)
    }
    
    // Handle optional API key - encrypt if provided, otherwise store placeholder
    let encryptedKey = ''  // Use empty string instead of null
    let keyPreview = 'Credits Only'
    
    if (api_key && api_key.trim()) {
      encryptedKey = btoa(api_key)
      keyPreview = api_key.length > 8 
        ? `${api_key.slice(0, 8)}...${api_key.slice(-4)}`
        : `${api_key.slice(0, 4)}***`
    }
    
    // Strip provider prefix from default_model (e.g., "openai/gpt-4o" -> "gpt-4o")
    let cleanDefaultModel = default_model
    if (default_model && default_model.includes('/')) {
      const parts = default_model.split('/')
      cleanDefaultModel = parts[parts.length - 1] // Get the last part after the final slash
    }
    
    // Get the current max display_order for this user to append new key at the end
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('user_api_keys')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false, nullsFirst: false })
      .limit(1)
    
    const maxOrder = maxOrderData && maxOrderData.length > 0 
      ? (maxOrderData[0].display_order ?? -1) 
      : -1

    const keyData = {
      user_id: user.id,
      provider,
      key_name: key_name || `${provider} Key`,
      encrypted_key: encryptedKey,
      key_preview: keyPreview,
      api_base: api_base || null,
      default_model: cleanDefaultModel || null,
      is_preferred,
      is_primary,
      monthly_budget,
      display_order: maxOrder + 1,
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
        
        // Build models array using cleaned model name
        const models = [cleanDefaultModel].filter(Boolean)
        
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