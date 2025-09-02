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
      .from('user_cli_configs')
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
        tool_name: cli.toolName,
        cli_path: cli.cliPath,
        is_default: cli.isDefault,
        auto_detect: cli.autoDetect,
        enabled: cli.enabled,
        config_options: cli.configOptions,
        last_verified: cli.lastVerified?.toISOString()
      }))

      if (configsToInsert.length > 0) {
        const { data: insertedConfigs, error: insertError } = await supabase
          .from('user_cli_configs')
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

    const { tool_name, cli_path, enabled, config_options } = await request.json()

    if (!tool_name || !cli_path) {
      return NextResponse.json({ error: 'tool_name and cli_path are required' }, { status: 400 })
    }

    // Verify the CLI tool works
    const cliManager = new CLIIntegrationManager()
    const isValid = await cliManager.verifyCLI({
      toolName: tool_name,
      cliPath: cli_path,
      isDefault: false,
      autoDetect: false,
      enabled: enabled ?? true,
      configOptions: config_options || {}
    })

    // Insert or update CLI configuration
    const { data, error } = await supabase
      .from('user_cli_configs')
      .upsert({
        user_id: user.id,
        tool_name,
        cli_path,
        enabled: enabled ?? true,
        config_options: config_options || {},
        last_verified: isValid ? new Date().toISOString() : null,
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
      message: isValid ? 'CLI tool verified and saved' : 'CLI tool saved but verification failed'
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

    const { id, enabled, cli_path, config_options } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (enabled !== undefined) updateData.enabled = enabled
    if (cli_path) updateData.cli_path = cli_path
    if (config_options) updateData.config_options = config_options

    // If CLI path changed, verify it
    if (cli_path) {
      const { data: existingConfig } = await supabase
        .from('user_cli_configs')
        .select('tool_name')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (existingConfig) {
        const cliManager = new CLIIntegrationManager()
        const isValid = await cliManager.verifyCLI({
          toolName: existingConfig.tool_name,
          cliPath: cli_path,
          isDefault: false,
          autoDetect: false,
          enabled: enabled ?? true,
          configOptions: config_options || {}
        })
        updateData.last_verified = isValid ? new Date().toISOString() : null
      }
    }

    const { data, error } = await supabase
      .from('user_cli_configs')
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
      .from('user_cli_configs')
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