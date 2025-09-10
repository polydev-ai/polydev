import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { spawn } from 'child_process'
import crypto from 'crypto'

interface CLICommandRequest {
  user_id: string
  mcp_token: string
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli'
  model?: string // Optional - will use user's preference if not provided
  prompt: string
}

interface CLICommandResult {
  success: boolean
  response?: string
  error?: string
  model_used?: string
}

/**
 * Execute CLI command with streaming support
 */
async function executeCliCommand(
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli',
  model: string,
  prompt: string,
  timeout = 30000
): Promise<CLICommandResult> {
  return new Promise((resolve) => {
    let command: string
    let args: string[]

    switch (provider) {
      case 'claude_code':
        command = 'claude'
        args = ['--model', model, prompt]
        break
      case 'codex_cli':
        command = 'codex'
        args = ['--model', model, prompt]
        break
      case 'gemini_cli':
        command = 'gemini'
        args = ['--model', model, prompt]
        break
      default:
        resolve({
          success: false,
          error: `Unsupported CLI provider: ${provider}`
        })
        return
    }

    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      timeout
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          response: stdout.trim(),
          model_used: model
        })
      } else {
        resolve({
          success: false,
          error: stderr.trim() || `Command exited with code ${code}`,
          model_used: model
        })
      }
    })

    child.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      })
    })

    // Set timeout
    setTimeout(() => {
      child.kill()
      resolve({
        success: false,
        error: 'Command timeout'
      })
    }, timeout)
  })
}

/**
 * Get user's configured models from database
 */
async function getUserModels(userId: string): Promise<Record<string, any> | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {},
        },
      }
    )

    const { data, error } = await supabase
      .from('user_preferences')
      .select('model_preferences')
      .eq('user_id', userId)
      .single()

    if (error || !data?.model_preferences) {
      console.log('No user model preferences found:', error?.message)
      return null
    }

    return data.model_preferences
  } catch (error) {
    console.error('Error fetching user models:', error)
    return null
  }
}

/**
 * Get the appropriate model for a provider from user preferences
 */
function getModelForProvider(
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli', 
  userPreferences: Record<string, any>
): string | null {
  // Map CLI providers to their corresponding provider IDs in preferences
  const providerMap = {
    'claude_code': 'anthropic',
    'codex_cli': 'openai', 
    'gemini_cli': 'google'
  }

  const preferencesKey = providerMap[provider]
  const providerPref = userPreferences[preferencesKey]

  if (!providerPref) {
    return null
  }

  // Handle both old format (string) and new format (object with models array)
  if (typeof providerPref === 'string') {
    return providerPref
  } else if (typeof providerPref === 'object' && Array.isArray(providerPref.models)) {
    // Use the first model in the array
    return providerPref.models[0] || null
  }

  return null
}

/**
 * Verify MCP token
 */
async function verifyMCPToken(userId: string, token: string): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {},
        },
      }
    )

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    
    const { data, error } = await supabase
      .from('mcp_user_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single()

    if (error || !data) {
      return false
    }

    return true
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CLICommandRequest = await request.json()
    const { user_id, mcp_token, provider, model, prompt } = body

    if (!user_id || !mcp_token || !provider || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, mcp_token, provider, prompt' },
        { status: 400 }
      )
    }

    // Verify MCP token
    const isValidToken = await verifyMCPToken(user_id, mcp_token)
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid or expired MCP token' },
        { status: 401 }
      )
    }

    console.log(`🚀 CLI command request for user: ${user_id}, provider: ${provider}`)

    // Determine which model to use
    let modelToUse = model
    
    if (!modelToUse) {
      // Get user's configured models from database
      const userPreferences = await getUserModels(user_id)
      
      if (userPreferences) {
        modelToUse = getModelForProvider(provider, userPreferences)
      }
      
      if (!modelToUse) {
        return NextResponse.json(
          { error: `No model configured for provider ${provider}. Please configure your model preferences.` },
          { status: 400 }
        )
      }
    }

    console.log(`📋 Using model: ${modelToUse} for provider: ${provider}`)

    // Execute CLI command
    const result = await executeCliCommand(provider, modelToUse, prompt)
    
    console.log(`✅ CLI command completed: success=${result.success}`)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('CLI command error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}