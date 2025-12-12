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
  timeout_ms?: number // Optional timeout in milliseconds
}

interface CLICommandResult {
  success: boolean
  response?: string
  error?: string
  model_used?: string
  execution_time_ms?: number
  tokens_estimated?: number
}

// CLI command configurations
const CLI_CONFIGS: Record<string, {
  command: string
  buildArgs: (prompt: string, model?: string) => string[]
  defaultModel: string
}> = {
  claude_code: {
    command: 'claude',
    buildArgs: (prompt, model) => {
      const args: string[] = []
      if (model) {
        args.push('--model', model)
      }
      args.push('-p', prompt)
      return args
    },
    defaultModel: 'claude-sonnet-4'
  },
  codex_cli: {
    command: 'codex',
    buildArgs: (prompt, model) => {
      const args: string[] = []
      if (model) {
        args.push('--model', model)
      }
      args.push(prompt)
      return args
    },
    defaultModel: 'gpt-4o'
  },
  gemini_cli: {
    command: 'gemini',
    buildArgs: (prompt, model) => {
      const args: string[] = []
      if (model) {
        args.push('-m', model)
      }
      args.push('-p', prompt)
      return args
    },
    defaultModel: 'gemini-2.5-pro'
  }
}

/**
 * Execute CLI command with streaming support
 */
async function executeCliCommand(
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli',
  prompt: string,
  model?: string,
  timeoutMs: number = 60000
): Promise<CLICommandResult> {
  const startTime = Date.now()
  const config = CLI_CONFIGS[provider]

  if (!config) {
    return {
      success: false,
      error: `Unsupported CLI provider: ${provider}`
    }
  }

  const args = config.buildArgs(prompt, model)
  const modelUsed = model || config.defaultModel

  return new Promise((resolve) => {
    console.log(`[CLI Command] Executing: ${config.command} ${args.join(' ').substring(0, 100)}...`)

    const child = spawn(config.command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: {
        ...process.env,
        NO_COLOR: '1',
        CI: '1',
        TERM: 'dumb'
      }
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    const timeout = setTimeout(() => {
      killed = true
      child.kill('SIGTERM')
      const executionTime = Date.now() - startTime
      resolve({
        success: false,
        error: `Command timed out after ${timeoutMs}ms`,
        model_used: modelUsed,
        execution_time_ms: executionTime
      })
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (killed) return

      const executionTime = Date.now() - startTime
      const cleanOutput = cleanCliOutput(stdout)
      
      // Estimate tokens (rough: 4 chars per token)
      const tokensEstimated = Math.ceil((prompt.length + cleanOutput.length) / 4)

      if (code === 0) {
        resolve({
          success: true,
          response: cleanOutput,
          model_used: modelUsed,
          execution_time_ms: executionTime,
          tokens_estimated: tokensEstimated
        })
      } else {
        resolve({
          success: false,
          error: stderr.trim() || `Command exited with code ${code}`,
          model_used: modelUsed,
          execution_time_ms: executionTime
        })
      }
    })

    child.on('error', (error) => {
      clearTimeout(timeout)
      const executionTime = Date.now() - startTime
      resolve({
        success: false,
        error: error.message,
        execution_time_ms: executionTime
      })
    })
  })
}

/**
 * Clean CLI output (remove ANSI codes, normalize whitespace)
 */
function cleanCliOutput(output: string): string {
  return output
    .replace(/\x1b\[[0-9;]*m/g, '')  // Remove ANSI escape codes
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')       // Collapse multiple newlines
    .trim()
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
      .maybeSingle()

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
        modelToUse = getModelForProvider(provider, userPreferences) || undefined
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
    const result = await executeCliCommand(provider, prompt, model)
    
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