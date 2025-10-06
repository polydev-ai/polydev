import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error in preferences GET:', userError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.log('No user found in preferences GET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('Preferences GET - User authenticated:', user.id)
    
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      console.error('Database error fetching preferences:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        console.log('No preferences found; returning empty preferences for user:', user.id)
        const emptyPreferences = {
          user_id: user.id,
          default_provider: 'openai',
          default_model: 'gpt-4o',
          preferred_providers: ['openai', 'anthropic', 'google'],
          usage_preference: 'auto', // auto, api_keys, credits, cli
          source_priority: ['cli', 'api', 'admin', 'credits'], // Default priority order
          prefer_own_keys: false,
          model_preferences: {
            openai: {
              models: ['gpt-4o'],
              order: 1
            },
            anthropic: {
              models: ['claude-3-5-sonnet-20241022'],
              order: 2
            },
            google: {
              models: ['gemini-2.0-flash-exp'],
              order: 3
            },
            'x-ai': {
              models: ['grok-2-latest'],
              order: 4
            }
          },
          mcp_settings: {
            default_temperature: 0.7,
            default_max_tokens: 4000,
            auto_select_model: false,
            memory_settings: {
              enable_conversation_memory: true,
              enable_project_memory: true,
              max_conversation_history: 10,
              auto_extract_patterns: true
            }
          }
        }
        return NextResponse.json({ preferences: emptyPreferences })
      }
      
      console.error('Unexpected database error fetching preferences:', error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }
    
    console.log('Preferences fetched successfully for user:', user.id)
    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Unexpected error in GET /api/preferences:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const updates = await request.json()
    
    // Validate the updates
    const allowedFields = [
      'default_provider',
      'default_model',
      'preferred_providers',
      'usage_preference',
      'source_priority',
      'model_preferences',
      'mcp_settings',
      'max_output_tokens_premium',
      'max_output_tokens_normal',
      'max_output_tokens_eco',
      'max_output_tokens_custom',
      'prefer_own_keys'
    ]
    
    const filteredUpdates: any = {}
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })
    
    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    
    // Use upsert to handle both new users and existing users
    const { data: updatedPreferences, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          ...filteredUpdates
        },
        {
          onConflict: 'user_id'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }
    
    return NextResponse.json({ preferences: updatedPreferences })
  } catch (error) {
    console.error('Error in PUT /api/preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}