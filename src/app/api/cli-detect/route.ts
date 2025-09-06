import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { spawn } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

interface CLIDetectionRequest {
  user_id: string
  mcp_token: string
}

interface CLIValidationResult {
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli'
  status: 'available' | 'unavailable' | 'not_installed'
  message: string
  cli_version?: string
  authenticated?: boolean
}

/**
 * Execute CLI command with timeout
 */
async function executeCommand(command: string, args: string[], timeout = 10000): Promise<{
  success: boolean
  stdout?: string
  stderr?: string
  error?: string
}> {
  return new Promise((resolve) => {
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
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      })
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
 * Detect Claude Code CLI
 */
async function detectClaudeCode(): Promise<CLIValidationResult> {
  try {
    // Check if claude command exists
    const versionResult = await executeCommand('claude', ['--version'])
    
    if (!versionResult.success) {
      return {
        provider: 'claude_code',
        status: 'not_installed',
        message: 'Claude Code CLI not found'
      }
    }

    // Check authentication status
    const authResult = await executeCommand('claude', ['auth', 'status'])
    
    // Claude Code auth status check - it responds with error code if not authenticated
    const isAuthenticated = authResult.success && !authResult.stderr?.includes('not authenticated')
    
    return {
      provider: 'claude_code',
      status: isAuthenticated ? 'available' : 'unavailable',
      message: isAuthenticated 
        ? 'Claude Code CLI authenticated and ready'
        : 'Claude Code CLI requires authentication',
      cli_version: versionResult.stdout,
      authenticated: isAuthenticated
    }
  } catch (error: any) {
    return {
      provider: 'claude_code',
      status: 'not_installed',
      message: `Error detecting Claude Code: ${error?.message || 'Unknown error'}`
    }
  }
}

/**
 * Detect Codex CLI
 */
async function detectCodexCli(): Promise<CLIValidationResult> {
  try {
    const versionResult = await executeCommand('codex', ['--version'])
    
    if (!versionResult.success) {
      return {
        provider: 'codex_cli',
        status: 'not_installed',
        message: 'Codex CLI not found'
      }
    }

    // Check authentication status
    const authResult = await executeCommand('codex', ['login', 'status'])
    
    // Check if authenticated - codex shows "Logged in using..." when authenticated
    const isAuthenticated = authResult.success && 
      (authResult.stdout?.includes('Logged in using') || 
       authResult.stdout?.includes('authenticated'))
    
    return {
      provider: 'codex_cli', 
      status: isAuthenticated ? 'available' : 'unavailable',
      message: isAuthenticated 
        ? 'Codex CLI authenticated and ready'
        : 'Codex CLI requires authentication',
      cli_version: versionResult.stdout,
      authenticated: isAuthenticated
    }
  } catch (error: any) {
    return {
      provider: 'codex_cli',
      status: 'not_installed', 
      message: `Error detecting Codex CLI: ${error?.message || 'Unknown error'}`
    }
  }
}

/**
 * Detect Gemini CLI
 */
async function detectGeminiCli(): Promise<CLIValidationResult> {
  try {
    const versionResult = await executeCommand('gemini', ['--version'])
    
    if (!versionResult.success) {
      return {
        provider: 'gemini_cli',
        status: 'not_installed',
        message: 'Gemini CLI not found'
      }
    }

    // Check authentication - this will vary based on actual Gemini CLI
    const authResult = await executeCommand('gemini', ['auth', 'status'])
    const isAuthenticated = authResult.success && !authResult.stderr?.includes('not authenticated')
    
    return {
      provider: 'gemini_cli',
      status: isAuthenticated ? 'available' : 'unavailable', 
      message: isAuthenticated 
        ? 'Gemini CLI authenticated and ready'
        : 'Gemini CLI requires authentication',
      cli_version: versionResult.stdout,
      authenticated: isAuthenticated
    }
  } catch (error: any) {
    return {
      provider: 'gemini_cli',
      status: 'not_installed',
      message: `Error detecting Gemini CLI: ${error?.message || 'Unknown error'}`
    }
  }
}

/**
 * Verify MCP token
 */
async function verifyMCPToken(userId: string, token: string): Promise<boolean> {
  try {
    // Use service role client to bypass RLS
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
      console.log('Token verification failed:', error?.message || 'Token not found')
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
    const body: CLIDetectionRequest = await request.json()
    const { user_id, mcp_token } = body

    if (!user_id || !mcp_token) {
      return NextResponse.json(
        { error: 'Missing user_id or mcp_token' },
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

    console.log(`🔍 Starting CLI detection for user: ${user_id}`)

    // Run all CLI detections in parallel
    const [claudeResult, codexResult, geminiResult] = await Promise.all([
      detectClaudeCode(),
      detectCodexCli(),
      detectGeminiCli()
    ])

    const results = [claudeResult, codexResult, geminiResult]
    
    console.log('✅ CLI detection completed:', results.map(r => `${r.provider}=${r.status}`).join(', '))

    return NextResponse.json(results)

  } catch (error: any) {
    console.error('CLI detection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}