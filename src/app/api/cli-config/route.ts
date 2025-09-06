import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's CLI configurations
    const { data: configs, error } = await supabase
      .from('cli_provider_configurations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no configs exist, create default entries (auto-detection happens client-side)
    if (!configs || configs.length === 0) {
      const defaultProviders = ['claude_code', 'codex_cli', 'gemini_cli']
      const configsToInsert = defaultProviders.map(provider => ({
        user_id: user.id,
        provider,
        custom_path: null,
        enabled: false,
        status: 'unchecked',
        last_checked_at: null
      }))

      const { data: insertedConfigs, error: insertError } = await supabase
        .from('cli_provider_configurations')
        .insert(configsToInsert)
        .select()

      if (!insertError) {
        return NextResponse.json({ 
          configs: insertedConfigs,
          detected: false,
          message: 'Created default CLI configurations. Use MCP to check status.'
        })
      }
    }

    return NextResponse.json({ 
      configs: configs || [],
      detected: false
    })

  } catch (error) {
    console.error('CLI config fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, custom_path, enabled } = await request.json()

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    // Note: CLI verification happens client-side through MCP bridges
    // Server-side verification is not needed since CLI tools are on user's machine

    // Insert or update CLI configuration
    const { data, error } = await supabase
      .from('cli_provider_configurations')
      .upsert({
        user_id: user.id,
        provider,
        custom_path,
        enabled: enabled ?? true,
        status: 'unchecked', // Status will be updated via MCP status checks
        last_checked_at: null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      config: data,
      message: 'CLI tool configuration saved. Status will be checked via MCP.'
    })

  } catch (error) {
    console.error('CLI config save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, enabled, custom_path, status, last_checked_at } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (enabled !== undefined) updateData.enabled = enabled
    if (custom_path !== undefined) updateData.custom_path = custom_path
    
    // Allow direct status updates from MCP results
    if (status) updateData.status = status
    if (last_checked_at) updateData.last_checked_at = last_checked_at

    // If custom_path changed, reset status to unchecked (will be updated via MCP)
    if (custom_path !== undefined && !status) {
      updateData.status = 'unchecked'
      updateData.last_checked_at = null
    }

    const { data, error } = await supabase
      .from('cli_provider_configurations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      config: data,
      message: 'CLI configuration updated successfully'
    })

  } catch (error) {
    console.error('CLI config update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('cli_provider_configurations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'CLI configuration deleted successfully'
    })

  } catch (error) {
    console.error('CLI config delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}