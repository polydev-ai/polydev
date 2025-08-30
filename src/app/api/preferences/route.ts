import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        const defaultPreferences = {
          user_id: user.id,
          default_provider: 'openai',
          default_model: 'gpt-4o',
          preferred_providers: ['openai', 'anthropic', 'google'],
          model_preferences: {
            openai: 'gpt-4o',
            anthropic: 'claude-3-5-sonnet-20241022',
            google: 'gemini-2.0-flash-exp'
          },
          mcp_settings: {
            default_temperature: 0.7,
            default_max_tokens: 4000,
            auto_select_model: true
          }
        }
        
        const { data: newPreferences, error: insertError } = await supabase
          .from('user_preferences')
          .insert(defaultPreferences)
          .select()
          .single()
        
        if (insertError) {
          console.error('Error creating default preferences:', insertError)
          return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
        }
        
        return NextResponse.json({ preferences: newPreferences })
      }
      
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }
    
    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error in GET /api/preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies()
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