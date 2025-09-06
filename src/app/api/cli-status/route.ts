import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export const dynamic = 'force-dynamic'

// Serverless-compatible CLI validation using basic checks
async function validateCLIStatus(cliType: string): Promise<{
  success: boolean
  result: string
  available: boolean
  error?: string
}> {
  console.log(`[CLI Status] Validating ${cliType} in serverless environment`)
  
  // In a serverless environment, we can't spawn subprocesses to directly test CLIs
  // Instead, we provide instructions for users to validate locally
  
  const cliInstructions = {
    claude_code: {
      name: 'Claude Code',
      checkCommand: 'claude --version',
      installInstructions: 'Install via: npm install -g @anthropic-ai/claude-code',
      authInstructions: 'Authenticate with: claude auth login'
    },
    codex_cli: {
      name: 'Codex CLI', 
      checkCommand: 'codex --version',
      installInstructions: 'Install Codex CLI from OpenAI',
      authInstructions: 'Authenticate with: codex auth'
    },
    gemini_cli: {
      name: 'Gemini CLI',
      checkCommand: 'gemini --version', 
      installInstructions: 'Install Gemini CLI from Google',
      authInstructions: 'Authenticate with: gemini auth login'
    }
  }
  
  const cli = cliInstructions[cliType as keyof typeof cliInstructions]
  
  if (!cli) {
    return {
      success: false,
      result: `❌ Unknown CLI type: ${cliType}`,
      available: false,
      error: 'Unknown CLI'
    }
  }
  
  // Return validation instructions since we can't directly test in serverless
  const result = `🔍 **${cli.name} Status Check**

⚠️  **Serverless Limitation**: Direct CLI validation requires a local environment.

**To validate ${cli.name} locally, run:**
\`\`\`bash
${cli.checkCommand}
\`\`\`

**If not installed:**
${cli.installInstructions}

**If not authenticated:**
${cli.authInstructions}

**For automatic validation:** Use this dashboard on a local server environment (not Vercel/serverless).

💡 **Status will be marked as "needs manual verification" until validated locally.**`

  return {
    success: true,
    result,
    available: false, // Conservative approach - assume not available until manually verified
    error: undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const { server, tool, args } = await request.json()
    
    // Validate request format
    if (!server || !tool) {
      return NextResponse.json({
        error: 'Invalid request format - server and tool are required'
      }, { status: 400 })
    }
    
    console.log(`[CLI Status] Real-time checking for ${server}:${tool}`)
    
    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log(`[CLI Status] User not authenticated:`, userError)
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }
    
    // Map server names to CLI provider types
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
    
    // Perform serverless-compatible CLI validation
    const validationResult = await validateCLIStatus(cliType)
    
    // Update database with validation status
    if (validationResult.success) {
      const newStatus = validationResult.available ? 'available' : 'needs_verification'
      const now = new Date().toISOString()
      
      // Update or create CLI configuration
      const { data: existingConfig } = await supabase
        .from('cli_provider_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', cliType)
        .single()
      
      if (existingConfig) {
        // Update existing
        await supabase
          .from('cli_provider_configurations')
          .update({
            status: newStatus,
            last_checked_at: now
          })
          .eq('id', existingConfig.id)
      } else {
        // Create new
        await supabase
          .from('cli_provider_configurations')
          .insert({
            user_id: user.id,
            provider: cliType,
            status: newStatus,
            enabled: true,
            last_checked_at: now
          })
      }
      
      console.log(`[CLI Status] Updated database: ${cliType} = ${newStatus}`)
    }
    
    return NextResponse.json({
      result: validationResult.result,
      available: validationResult.available,
      success: validationResult.success,
      last_checked_at: new Date().toISOString(),
      serverless_validation: true, // Flag to indicate serverless validation
      needs_local_verification: true
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
      .from('cli_provider_configurations')
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
      const isAvailable = config.enabled && 
                         config.status === 'available' && 
                         config.last_checked_at && 
                         new Date(config.last_checked_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      cliStatus[config.provider as keyof typeof cliStatus] = {
        available: isAvailable,
        status: config.status,
        last_checked_at: config.last_checked_at,
        enabled: config.enabled,
        custom_path: config.custom_path
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