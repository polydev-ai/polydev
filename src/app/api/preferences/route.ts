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
        console.log('No preferences found, creating defaults for user:', user.id)
        const defaultPreferences = {
          user_id: user.id,
          default_provider: 'openai',
          default_model: 'gpt-4o',
          preferred_providers: ['openai', 'anthropic', 'google'],
          usage_preference: 'auto', // auto, api_keys, credits, cli
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
              models: ['gemini-2.5-flash'],
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
            auto_select_model: true,
            memory_settings: {
              enable_conversation_memory: true,
              enable_project_memory: true,
              max_conversation_history: 10,
              auto_extract_patterns: true
            }
          }
        }
        
        const { data: newPreferences, error: insertError } = await supabase
          .from('user_preferences')
          .insert(defaultPreferences)
          .select()
          .single()
        
        if (insertError) {
          console.error('Database error creating default preferences:', insertError)
          console.error('Insert error details:', JSON.stringify(insertError, null, 2))
          return NextResponse.json({ error: `Failed to create preferences: ${insertError.message}` }, { status: 500 })
        }
        
        console.log('Default preferences created successfully for user:', user.id)
        
        return NextResponse.json({ preferences: newPreferences })
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
      'model_preferences',
      'mcp_settings'
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
    
    const { data: updatedPreferences, error } = await supabase
      .from('user_preferences')
      .update(filteredUpdates)
      .eq('user_id', user.id)
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
