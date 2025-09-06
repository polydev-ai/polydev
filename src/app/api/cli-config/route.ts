import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import CLIIntegrationManager from '@/lib/cliIntegration'

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

    // If no configs exist, auto-detect and create them
    if (!configs || configs.length === 0) {
      const cliManager = new CLIIntegrationManager()
      const detectedCLIs = await cliManager.detectAvailableCLIs()

      // Insert detected CLIs into database
      const configsToInsert = detectedCLIs.map(cli => ({
        user_id: user.id,
        provider: cli.toolName,
        custom_path: cli.cliPath,
        enabled: cli.enabled,
        status: cli.lastVerified ? 'available' : 'unchecked',
        last_checked_at: cli.lastVerified?.toISOString()
      }))

      if (configsToInsert.length > 0) {
        const { data: insertedConfigs, error: insertError } = await supabase
          .from('cli_provider_configurations')
          .insert(configsToInsert)
          .select()

        if (!insertError) {
          return NextResponse.json({ 
            configs: insertedConfigs,
            detected: true,
            message: `Auto-detected ${insertedConfigs.length} CLI tools`
          })
        }
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

    // Verify the CLI tool works if custom_path is provided
    let isValid = false
    if (custom_path) {
      const cliManager = new CLIIntegrationManager()
      isValid = await cliManager.verifyCLI({
        toolName: provider,
        cliPath: custom_path,
        isDefault: false,
        autoDetect: false,
        enabled: enabled ?? true,
        configOptions: {}
      })
    }

    // Insert or update CLI configuration
    const { data, error } = await supabase
      .from('cli_provider_configurations')
      .upsert({
        user_id: user.id,
        provider,
        custom_path,
        enabled: enabled ?? true,
        status: custom_path ? (isValid ? 'available' : 'unavailable') : 'unchecked',
        last_checked_at: custom_path ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      config: data,
      verified: isValid,
      message: custom_path 
        ? (isValid ? 'CLI tool verified and saved' : 'CLI tool saved but verification failed')
        : 'CLI tool configuration saved'
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

    const { id, enabled, custom_path } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (enabled !== undefined) updateData.enabled = enabled
    if (custom_path !== undefined) updateData.custom_path = custom_path

    // If CLI path changed, verify it
    if (custom_path !== undefined) {
      const { data: existingConfig } = await supabase
        .from('cli_provider_configurations')
        .select('provider')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (existingConfig && custom_path) {
        const cliManager = new CLIIntegrationManager()
        const isValid = await cliManager.verifyCLI({
          toolName: existingConfig.provider,
          cliPath: custom_path,
          isDefault: false,
          autoDetect: false,
          enabled: enabled ?? true,
          configOptions: {}
        })
        updateData.status = isValid ? 'available' : 'unavailable'
        updateData.last_checked_at = new Date().toISOString()
      } else if (!custom_path) {
        updateData.status = 'unchecked'
        updateData.last_checked_at = null
      }
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