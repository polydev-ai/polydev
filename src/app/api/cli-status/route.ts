import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { server, tool, args } = await request.json()
    
    // Validate request format
    if (!server || !tool) {
      return NextResponse.json({
        error: 'Invalid request format - server and tool are required'
      }, { status: 400 })
    }
    
    console.log(`[CLI Status] Checking status for ${server}:${tool}`)
    
    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log(`[CLI Status] User not authenticated:`, userError)
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }
    
    // Check CLI configuration from database
    const { data: cliConfigs, error: configError } = await supabase
      .from('cli_configurations')
      .select('*')
      .eq('user_id', user.id)
    
    if (configError) {
      console.error(`[CLI Status] Database error:`, configError)
      return NextResponse.json({
        error: 'Failed to check CLI status'
      }, { status: 500 })
    }
    
    console.log(`[CLI Status] Found ${cliConfigs?.length || 0} CLI configurations for user`)
    
    // Map server names to CLI types
    const serverToCLI = {
      'claude-code-cli-bridge': 'claude_code',
      'cross-llm-bridge-test': 'codex_cli', 
      'gemini-cli-bridge': 'gemini_cli'
    }
    
    const cliType = serverToCLI[server as keyof typeof serverToCLI]
    if (!cliType) {
      return NextResponse.json({
        error: `Unknown server: ${server}`
      }, { status: 400 })
    }
    
    // Check if CLI is configured and available
    const cliConfig = cliConfigs?.find(config => config.cli_type === cliType)
    
    if (!cliConfig) {
      console.log(`[CLI Status] No configuration found for ${cliType}`)
      return NextResponse.json({
        result: `❌ ${cliType.replace('_', ' ').toUpperCase()} not configured`,
        available: false
      })
    }
    
    // Check if CLI is available (has valid token and recent activity)
    const isAvailable = cliConfig.status === 'available' && 
                       cliConfig.last_seen && 
                       new Date(cliConfig.last_seen) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
    
    console.log(`[CLI Status] ${cliType} status: ${cliConfig.status}, last_seen: ${cliConfig.last_seen}, available: ${isAvailable}`)
    
    return NextResponse.json({
      result: isAvailable 
        ? `✅ ${cliType.replace('_', ' ').toUpperCase()} is available and working`
        : `❌ ${cliType.replace('_', ' ').toUpperCase()} configured but not active (last seen: ${cliConfig.last_seen})`,
      available: isAvailable,
      status: cliConfig.status,
      last_seen: cliConfig.last_seen,
      version: cliConfig.version
    })
    
  } catch (error) {
    console.error(`[CLI Status] Error:`, error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }
    
    // Get all CLI configurations for the user
    const { data: cliConfigs, error: configError } = await supabase
      .from('cli_configurations')
      .select('*')
      .eq('user_id', user.id)
    
    if (configError) {
      console.error(`[CLI Status] Database error:`, configError)
      return NextResponse.json({
        error: 'Failed to get CLI status'
      }, { status: 500 })
    }
    
    // Format response for all CLI types
    const cliStatus: {
      claude_code: any,
      codex_cli: any,
      gemini_cli: any
    } = {
      claude_code: null,
      codex_cli: null,
      gemini_cli: null
    }
    
    cliConfigs?.forEach(config => {
      const isAvailable = config.status === 'available' && 
                         config.last_seen && 
                         new Date(config.last_seen) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      cliStatus[config.cli_type as keyof typeof cliStatus] = {
        available: isAvailable,
        status: config.status,
        last_seen: config.last_seen,
        version: config.version,
        token_valid: !!config.cli_status_token
      }
    })
    
    return NextResponse.json(cliStatus)
    
  } catch (error) {
    console.error(`[CLI Status] Error:`, error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}