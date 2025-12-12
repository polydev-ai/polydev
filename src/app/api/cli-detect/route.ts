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
  issue_type?: 'not_installed' | 'not_authenticated' | 'compatibility_issue' | 'environment_issue' | 'unknown'
  solutions?: string[]
  install_command?: string
  auth_command?: string
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
      timeout,
      env: {
        ...process.env,
        // Ensure CLI tools don't try to open browsers or expect TTY
        NO_BROWSER: '1',
        CI: '1',
        TERM: 'dumb'
      },
      detached: false
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
 * Uses 'claude --version' for installation check
 * Uses config file check for authentication (faster than running a prompt)
 */
async function detectClaudeCode(): Promise<CLIValidationResult> {
  try {
    // First check if claude command exists
    const versionResult = await executeCommand('claude', ['--version'], 5000)
    if (!versionResult.success) {
      return {
        provider: 'claude_code',
        status: 'not_installed',
        message: 'Claude Code CLI not installed',
        issue_type: 'not_installed',
        solutions: [
          'Install Claude Code CLI: npm install -g @anthropic-ai/claude-code',
          'Or visit: https://claude.ai/download',
          'Restart your terminal after installation'
        ],
        install_command: 'npm install -g @anthropic-ai/claude-code',
        auth_command: 'claude login'
      }
    }

    const version = versionResult.stdout || 'Unknown version'

    // Check authentication by running 'claude config list' or checking auth status
    // This is faster and more reliable than running a test prompt
    const authCheck = await executeCommand('claude', ['config', 'list'], 5000)
    
    console.log('Claude auth check result:', {
      success: authCheck.success,
      stdout: authCheck.stdout?.substring(0, 200),
      stderr: authCheck.stderr?.substring(0, 100)
    })

    const allOutput = (authCheck.stdout || '') + ' ' + (authCheck.stderr || '')
    const outputLower = allOutput.toLowerCase()

    // Check for authentication errors
    if (outputLower.includes('not logged in') || 
        outputLower.includes('not authenticated') ||
        outputLower.includes('please login') ||
        outputLower.includes('please log in') ||
        outputLower.includes('run `claude login`') ||
        outputLower.includes('unauthorized')) {
      return {
        provider: 'claude_code',
        status: 'unavailable',
        message: 'Claude Code CLI not authenticated',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: [
          'Run: claude login',
          'Follow browser authentication prompts',
          'Ensure you have an active Claude subscription'
        ],
        auth_command: 'claude login'
      }
    }

    // If config list works without auth errors, assume authenticated
    if (authCheck.success || (authCheck.stdout && authCheck.stdout.length > 0)) {
      return {
        provider: 'claude_code',
        status: 'available',
        message: 'Claude Code CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // Fallback: try a minimal prompt test
    const testResult = await executeCommand('claude', ['-p', 'hi', '--no-input'], 10000)
    
    if (testResult.success || (testResult.stdout && testResult.stdout.trim().length > 0)) {
      return {
        provider: 'claude_code',
        status: 'available',
        message: 'Claude Code CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // Check test result for auth errors
    const testOutput = (testResult.stdout || '') + ' ' + (testResult.stderr || '') + ' ' + (testResult.error || '')
    if (testOutput.toLowerCase().includes('login') || testOutput.toLowerCase().includes('auth')) {
      return {
        provider: 'claude_code',
        status: 'unavailable',
        message: 'Claude Code CLI requires authentication',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: ['Run: claude login'],
        auth_command: 'claude login'
      }
    }

    // Status unclear
    return {
      provider: 'claude_code',
      status: 'unavailable',
      message: 'Claude Code CLI status unclear - please verify manually',
      cli_version: version,
      authenticated: false,
      issue_type: 'unknown',
      solutions: [
        'Try: claude -p "hello"',
        'If not working: claude login',
        'Check your internet connection'
      ],
      auth_command: 'claude login'
    }
  } catch (error: any) {
    return {
      provider: 'claude_code',
      status: 'not_installed',
      message: `Error detecting Claude Code: ${error?.message || 'Unknown error'}`,
      issue_type: 'unknown',
      solutions: ['Try reinstalling: npm install -g @anthropic-ai/claude-code'],
      install_command: 'npm install -g @anthropic-ai/claude-code'
    }
  }
}

/**
 * Detect Codex CLI (OpenAI's CLI tool)
 * Uses 'codex --version' for installation check
 * Uses 'codex auth status' or config check for authentication
 */
async function detectCodexCli(): Promise<CLIValidationResult> {
  try {
    // First check if codex command exists
    const versionResult = await executeCommand('codex', ['--version'], 5000)
    if (!versionResult.success) {
      return {
        provider: 'codex_cli',
        status: 'not_installed',
        message: 'Codex CLI not installed',
        issue_type: 'not_installed',
        solutions: [
          'Install Codex CLI: npm install -g @openai/codex',
          'Or: brew install openai-codex (macOS)',
          'Restart your terminal after installation'
        ],
        install_command: 'npm install -g @openai/codex',
        auth_command: 'codex auth'
      }
    }

    const version = versionResult.stdout || 'Unknown version'

    // Check authentication status
    const authResult = await executeCommand('codex', ['auth', 'whoami'], 5000)
    
    console.log('Codex auth check result:', {
      success: authResult.success,
      stdout: authResult.stdout?.substring(0, 200),
      stderr: authResult.stderr?.substring(0, 100)
    })

    const allOutput = (authResult.stdout || '') + ' ' + (authResult.stderr || '')
    const outputLower = allOutput.toLowerCase()

    // Check for authentication success indicators
    if (authResult.success && 
        (outputLower.includes('logged in') || 
         outputLower.includes('authenticated') ||
         outputLower.includes('@') ||  // Email indicates logged in
         authResult.stdout?.includes('user'))) {
      return {
        provider: 'codex_cli',
        status: 'available',
        message: 'Codex CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // Check for authentication errors
    if (outputLower.includes('not logged in') || 
        outputLower.includes('not authenticated') ||
        outputLower.includes('unauthorized') ||
        outputLower.includes('login required') ||
        outputLower.includes('api key')) {
      return {
        provider: 'codex_cli',
        status: 'unavailable',
        message: 'Codex CLI not authenticated',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: [
          'Run: codex auth',
          'Follow browser login prompts',
          'Ensure you have a ChatGPT Plus or OpenAI API subscription'
        ],
        auth_command: 'codex auth'
      }
    }

    // Fallback: try 'codex auth status' if 'whoami' didn't work
    const statusResult = await executeCommand('codex', ['auth', 'status'], 5000)
    if (statusResult.success) {
      const statusOutput = (statusResult.stdout || '').toLowerCase()
      if (statusOutput.includes('logged in') || statusOutput.includes('authenticated')) {
        return {
          provider: 'codex_cli',
          status: 'available',
          message: 'Codex CLI authenticated and ready',
          cli_version: version,
          authenticated: true
        }
      }
    }

    // Default: assume not authenticated if we can't verify
    return {
      provider: 'codex_cli',
      status: 'unavailable',
      message: 'Codex CLI authentication status unknown',
      cli_version: version,
      authenticated: false,
      issue_type: 'environment_issue',
      solutions: [
        'Try: codex auth',
        'Check: codex auth status',
        'Ensure you have an OpenAI account'
      ],
      auth_command: 'codex auth'
    }
  } catch (error: any) {
    return {
      provider: 'codex_cli',
      status: 'not_installed',
      message: `Error detecting Codex CLI: ${error?.message || 'Unknown error'}`,
      issue_type: 'unknown',
      solutions: ['Try: npm install -g @openai/codex'],
      install_command: 'npm install -g @openai/codex'
    }
  }
}

/**
 * Detect Gemini CLI (Google's CLI tool)
 * Uses 'gemini --version' for installation check
 * Uses auth check for authentication status
 */
async function detectGeminiCli(): Promise<CLIValidationResult> {
  try {
    // First check if gemini command exists using 'which'
    const existsResult = await executeCommand('sh', ['-c', 'command -v gemini'], 3000)
    
    if (!existsResult.success || !existsResult.stdout?.trim()) {
      return {
        provider: 'gemini_cli',
        status: 'not_installed',
        message: 'Gemini CLI not installed',
        issue_type: 'not_installed',
        solutions: [
          'Install Gemini CLI: npm install -g @google/gemini-cli',
          'Requires Node.js 18+ (20+ recommended)',
          'Restart your terminal after installation'
        ],
        install_command: 'npm install -g @google/gemini-cli',
        auth_command: 'gemini auth'
      }
    }

    // Get version
    const versionResult = await executeCommand('gemini', ['--version'], 5000)
    
    // Check for Node.js compatibility issues
    const versionOutput = (versionResult.stdout || '') + ' ' + (versionResult.stderr || '') + ' ' + (versionResult.error || '')
    if (versionOutput.includes('ReferenceError') || 
        versionOutput.includes('File is not defined') ||
        versionOutput.includes('undici')) {
      return {
        provider: 'gemini_cli',
        status: 'unavailable',
        message: 'Gemini CLI has Node.js compatibility issues',
        issue_type: 'compatibility_issue',
        solutions: [
          'Upgrade Node.js to version 20+',
          'Run: nvm install 20 && nvm use 20',
          'Then reinstall: npm install -g @google/gemini-cli',
          'Known issue with Node.js 18 and undici dependency'
        ],
        install_command: 'nvm install 20 && npm install -g @google/gemini-cli'
      }
    }

    const version = versionResult.stdout?.trim() || 'Gemini CLI'

    // Check authentication
    const authResult = await executeCommand('gemini', ['auth', 'status'], 5000)
    
    console.log('Gemini auth check result:', {
      success: authResult.success,
      stdout: authResult.stdout?.substring(0, 200),
      stderr: authResult.stderr?.substring(0, 100)
    })

    const allOutput = (authResult.stdout || '') + ' ' + (authResult.stderr || '')
    const outputLower = allOutput.toLowerCase()

    // Check for authentication success
    if (authResult.success && 
        (outputLower.includes('logged in') || 
         outputLower.includes('authenticated') ||
         outputLower.includes('active') ||
         outputLower.includes('@google') ||
         outputLower.includes('@gmail'))) {
      return {
        provider: 'gemini_cli',
        status: 'available',
        message: 'Gemini CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // Check for authentication errors
    if (outputLower.includes('not authenticated') || 
        outputLower.includes('not logged in') ||
        outputLower.includes('please login') ||
        outputLower.includes('unauthorized') ||
        outputLower.includes('api key')) {
      return {
        provider: 'gemini_cli',
        status: 'unavailable',
        message: 'Gemini CLI not authenticated',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: [
          'Run: gemini auth login',
          'Follow browser authentication prompts',
          'Ensure you have a Google account with Gemini access'
        ],
        auth_command: 'gemini auth login'
      }
    }

    // Check for Node.js compatibility issues in auth check
    if (outputLower.includes('referenceerror') || outputLower.includes('file is not defined')) {
      return {
        provider: 'gemini_cli',
        status: 'unavailable',
        message: 'Gemini CLI has Node.js compatibility issues',
        cli_version: version,
        authenticated: false,
        issue_type: 'compatibility_issue',
        solutions: [
          'Upgrade Node.js to version 20+',
          'Run: nvm install 20 && nvm use 20',
          'Then reinstall: npm install -g @google/gemini-cli'
        ],
        install_command: 'nvm install 20 && npm install -g @google/gemini-cli'
      }
    }

    // Fallback: try running 'gemini auth' without arguments
    const authCheck = await executeCommand('gemini', ['auth'], 3000)
    if (authCheck.success) {
      const authOutput = (authCheck.stdout || '').toLowerCase()
      if (authOutput.includes('logged in') || authOutput.includes('authenticated')) {
        return {
          provider: 'gemini_cli',
          status: 'available',
          message: 'Gemini CLI authenticated and ready',
          cli_version: version,
          authenticated: true
        }
      }
    }

    // Default: status unknown
    return {
      provider: 'gemini_cli',
      status: 'unavailable',
      message: 'Gemini CLI authentication status unknown',
      cli_version: version,
      authenticated: false,
      issue_type: 'environment_issue',
      solutions: [
        'Try: gemini auth login',
        'Check: gemini auth status',
        'Ensure you have a Google account with Gemini access'
      ],
      auth_command: 'gemini auth login'
    }
  } catch (error: any) {
    return {
      provider: 'gemini_cli',
      status: 'not_installed',
      message: `Error detecting Gemini CLI: ${error?.message || 'Unknown error'}`,
      issue_type: 'unknown',
      solutions: ['Try: npm install -g @google/gemini-cli'],
      install_command: 'npm install -g @google/gemini-cli'
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

    // Skip token validation for dashboard checks (allow temporary detection)
    const isDashboardCheck = user_id === 'dashboard-check' && mcp_token === 'temp-token'
    
    if (!isDashboardCheck) {
      // Verify MCP token for real requests
      const isValidToken = await verifyMCPToken(user_id, mcp_token)
      if (!isValidToken) {
        return NextResponse.json(
          { error: 'Invalid or expired MCP token' },
          { status: 401 }
        )
      }
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