import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[sync-models] Starting model sync for user:', user.id)

    // Fetch active API keys
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)

    if (apiKeysError) {
      console.error('[sync-models] Error fetching API keys:', apiKeysError)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    console.log('[sync-models] Found API keys:', apiKeys?.map(k => ({
      provider: k.provider,
      model: k.default_model,
      active: k.active
    })))

    if (!apiKeys || apiKeys.length === 0) {
      return NextResponse.json({
        message: 'No active API keys found',
        synced: false,
        models: []
      })
    }

    // Get current preferences
    const { data: currentPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('model_preferences, mcp_settings')
      .eq('user_id', user.id)
      .single()

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('[sync-models] Error fetching preferences:', prefsError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    const modelPreferences = currentPrefs?.model_preferences || {}
    const mcpSettings = currentPrefs?.mcp_settings || {}

    // Clear existing preferences and rebuild from active API keys only
    const newPreferences: any = {}
    const newSavedChatModels: string[] = []
    let hasChanges = false
    const syncedModels: string[] = []

    // Auto-sync models from API keys
    let order = 1
    for (const apiKey of apiKeys) {
      if (apiKey.default_model && apiKey.provider && apiKey.active) {
        const provider = apiKey.provider
        const model = apiKey.default_model

        // Initialize provider
        newPreferences[provider] = {
          models: [model],
          order: order++
        }

        // Add to saved chat models
        newSavedChatModels.push(model)

        syncedModels.push(`${provider}/${model}`)
        console.log(`[sync-models] Synced model ${model} from provider ${provider}`)
      }
    }

    // Check if preferences changed
    const currentSavedModels = mcpSettings?.saved_chat_models || []
    const prefsChanged = JSON.stringify(modelPreferences) !== JSON.stringify(newPreferences)
    const chatModelsChanged = JSON.stringify(currentSavedModels.sort()) !== JSON.stringify(newSavedChatModels.sort())
    hasChanges = prefsChanged || chatModelsChanged

    // Update preferences if there were changes
    if (hasChanges) {
      console.log('[sync-models] Updating preferences with new models:', newPreferences)

      const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          model_preferences: newPreferences,
          mcp_settings: {
            ...mcpSettings,
            saved_chat_models: newSavedChatModels
          },
          updated_at: new Date().toISOString()
        })

      if (updateError) {
        console.error('[sync-models] Error updating preferences:', updateError)
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Models synced successfully',
        synced: true,
        models: syncedModels,
        preferences: newPreferences
      })
    } else {
      return NextResponse.json({
        message: 'All models already synced',
        synced: false,
        models: []
      })
    }

  } catch (error) {
    console.error('[sync-models] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}