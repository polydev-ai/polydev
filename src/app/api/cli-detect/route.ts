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
 */
async function detectClaudeCode(): Promise<CLIValidationResult> {
  try {
    // First check if claude command exists
    const versionResult = await executeCommand('claude', ['--version'], 3000)
    if (!versionResult.success) {
      return {
        provider: 'claude_code',
        status: 'not_installed',
        message: 'Claude Code CLI not installed',
        issue_type: 'not_installed',
        solutions: [
          'Install Claude Code CLI',
          'Restart your terminal after installation',
          'Make sure the CLI is in your PATH'
        ],
        install_command: 'npm install -g @anthropic-ai/claude-code',
        auth_command: 'claude auth login'
      }
    }

    const version = versionResult.stdout || 'Unknown version'

    // Test authentication with a minimal prompt and shorter timeout
    const testResult = await executeCommand('claude', ['-p', 'ok'], 8000)
    
    console.log('Claude test result:', {
      success: testResult.success,
      stdout: testResult.stdout?.substring(0, 100),
      stderr: testResult.stderr?.substring(0, 100),
      error: testResult.error
    })

    // Check for authentication errors in all output sources
    const allOutput = (testResult.stdout || '') + ' ' + (testResult.stderr || '') + ' ' + (testResult.error || '')
    const outputLower = allOutput.toLowerCase()
    
    // Clear authentication failure patterns
    if (outputLower.includes('not logged in') || 
        outputLower.includes('authentication required') || 
        outputLower.includes('please log in') ||
        outputLower.includes('login required') ||
        outputLower.includes('unauthorized') ||
        outputLower.includes('auth login') ||
        outputLower.includes('please authenticate')) {
      return {
        provider: 'claude_code',
        status: 'unavailable',
        message: 'Claude Code CLI not authenticated',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: [
          'Run authentication command',
          'Follow browser login prompts',
          'Ensure you have an active Anthropic account'
        ],
        auth_command: 'claude auth login'
      }
    }

    // If we got any response output (even if command "failed" due to timeout), authentication likely worked
    if (testResult.stdout && testResult.stdout.trim().length > 0) {
      return {
        provider: 'claude_code',
        status: 'available',
        message: 'Claude Code CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // If command timed out but no auth errors, it's likely authenticated but slow
    if (testResult.error?.includes('timeout') && !outputLower.includes('auth')) {
      return {
        provider: 'claude_code',
        status: 'available',
        message: 'Claude Code CLI authenticated (slow response)',
        cli_version: version,
        authenticated: true,
        issue_type: 'environment_issue',
        solutions: [
          'CLI is authenticated but network responses are slow',
          'This is normal for cold starts',
          'Check internet connection if consistently slow'
        ]
      }
    }

    // If no output and no clear error, status is unclear
    return {
      provider: 'claude_code',
      status: 'unavailable',
      message: 'Claude Code CLI status unclear - please verify',
      cli_version: version,
      authenticated: false,
      issue_type: 'unknown',
      solutions: [
        'Try manual test: claude -p "hello"',
        'If not working: claude auth login',
        'Check internet connection'
      ],
      auth_command: 'claude auth login'
    }
  } catch (error: any) {
    return {
      provider: 'claude_code',
      status: 'not_installed',
      message: `Error detecting Claude Code: ${error?.message || 'Unknown error'}`,
      issue_type: 'unknown',
      solutions: ['Try reinstalling the CLI'],
      install_command: 'npm install -g @anthropic-ai/claude-code'
    }
  }
}

/**
 * Detect Codex CLI
 */
async function detectCodexCli(): Promise<CLIValidationResult> {
  try {
    // First check if codex command exists
    const versionResult = await executeCommand('codex', ['--version'], 3000)
    if (!versionResult.success) {
      return {
        provider: 'codex_cli',
        status: 'not_installed',
        message: 'Codex CLI not installed',
        issue_type: 'not_installed',
        solutions: [
          'Install Codex CLI via npm',
          'Alternative: Install via Homebrew',
          'Restart your terminal after installation'
        ],
        install_command: 'npm install -g @openai/codex',
        auth_command: 'codex login'
      }
    }

    const version = versionResult.stdout || 'Unknown version'

    // Try simple execution test with proper timeout
    const testResult = await executeCommand('codex', ['exec', 'test'], 10000)
    
    if (testResult.success && testResult.stdout?.includes('test')) {
      // Perfect - CLI is working and authenticated
      return {
        provider: 'codex_cli',
        status: 'available',
        message: 'Codex CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // Check specific error types
    const errorText = (testResult.stderr || testResult.error || '').toLowerCase()
    
    if (errorText.includes('not logged in') || 
        errorText.includes('authentication') || 
        errorText.includes('login required') ||
        errorText.includes('unauthorized') ||
        errorText.includes('api key')) {
      return {
        provider: 'codex_cli',
        status: 'unavailable',
        message: 'Codex CLI not authenticated',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: [
          'Run login command',
          'Follow browser login prompts',
          'Ensure you have OpenAI API access',
          'Check your OpenAI account has Codex access'
        ],
        auth_command: 'codex login'
      }
    }

    // If exec command failed due to timeout or other issues, check login status directly
    const loginCheck = await executeCommand('codex', ['login', 'status'], 3000)
    if (loginCheck.success && loginCheck.stdout?.includes('Logged in using')) {
      return {
        provider: 'codex_cli', 
        status: 'available',
        message: 'Codex CLI authenticated (slow response may indicate network issues)',
        cli_version: version,
        authenticated: true,
        issue_type: 'environment_issue',
        solutions: [
          'CLI is working but responses are slow',
          'Check your internet connection',
          'Consider upgrading your OpenAI plan for faster responses'
        ]
      }
    }

    // Default to authentication issue if we can't determine the exact problem
    return {
      provider: 'codex_cli', 
      status: 'unavailable',
      message: 'Codex CLI installed but may have authentication or environment issues',
      cli_version: version,
      authenticated: false,
      issue_type: 'environment_issue',
      solutions: [
        'Try running: codex login',
        'Check your internet connection',
        'Verify your OpenAI account status',
        'Update CLI: npm update -g @openai/codex'
      ],
      auth_command: 'codex login'
    }
  } catch (error: any) {
    return {
      provider: 'codex_cli',
      status: 'not_installed', 
      message: `Error detecting Codex CLI: ${error?.message || 'Unknown error'}`,
      issue_type: 'unknown',
      solutions: ['Try reinstalling the CLI'],
      install_command: 'npm install -g @openai/codex'
    }
  }
}

/**
 * Detect Gemini CLI
 */
async function detectGeminiCli(): Promise<CLIValidationResult> {
  try {
    // First check if gemini command exists
    const existsResult = await executeCommand('sh', ['-c', 'command -v gemini'], 3000)
    
    if (!existsResult.success) {
      return {
        provider: 'gemini_cli',
        status: 'not_installed',
        message: 'Gemini CLI not installed',
        issue_type: 'not_installed',
        solutions: [
          'Install Gemini CLI via npm',
          'Make sure you have Node.js 18+ installed',
          'Restart your terminal after installation'
        ],
        install_command: 'npm install -g @google/gemini-cli',
        auth_command: 'gemini login'
      }
    }

    // Get version - this will also reveal Node.js compatibility issues
    const versionResult = await executeCommand('gemini', ['--version'], 3000)
    
    // Check for Node.js compatibility issues first
    if (!versionResult.success) {
      const errorText = versionResult.error || versionResult.stderr || ''
      if (errorText.includes('ReferenceError') || errorText.includes('File is not defined')) {
        return {
          provider: 'gemini_cli',
          status: 'unavailable',
          message: 'Gemini CLI has Node.js compatibility issues',
          issue_type: 'compatibility_issue',
          solutions: [
            'Update Node.js to version 20+ (current issue with v18)',
            'Alternative: Use nvm to switch Node versions: nvm install 20 && nvm use 20',
            'Reinstall Gemini CLI after Node update',
            'Check GitHub issues for @google/gemini-cli compatibility'
          ],
          install_command: 'nvm install 20 && nvm use 20 && npm install -g @google/gemini-cli'
        }
      }
      
      return {
        provider: 'gemini_cli',
        status: 'unavailable', 
        message: 'Gemini CLI installed but has issues',
        issue_type: 'unknown',
        solutions: ['Try reinstalling the CLI'],
        install_command: 'npm install -g @google/gemini-cli'
      }
    }

    const version = versionResult.stdout || 'Gemini CLI'

    // Test with simple prompt using fast model
    const testResult = await executeCommand('gemini', ['-m', 'gemini-2.5-flash', '-p', 'test'], 10000)
    
    if (testResult.success && testResult.stdout?.includes('test')) {
      // Perfect - CLI is working and authenticated
      return {
        provider: 'gemini_cli',
        status: 'available', 
        message: 'Gemini CLI authenticated and ready',
        cli_version: version,
        authenticated: true
      }
    }

    // Check for specific error types
    const errorText = (testResult.stderr || testResult.error || '').toLowerCase()
    
    if (errorText.includes('not authenticated') || 
        errorText.includes('authentication') || 
        errorText.includes('login required') ||
        errorText.includes('api key')) {
      return {
        provider: 'gemini_cli',
        status: 'unavailable',
        message: 'Gemini CLI not authenticated',
        cli_version: version,
        authenticated: false,
        issue_type: 'not_authenticated',
        solutions: [
          'Run authentication command',
          'Use browser login or API key setup',
          'Ensure you have Google AI API access',
          'Check your Google Cloud billing is enabled'
        ],
        auth_command: 'gemini login'
      }
    }

    // Check for Node.js compatibility issues in execution
    if (errorText.includes('referenceerror') || errorText.includes('file is not defined')) {
      return {
        provider: 'gemini_cli',
        status: 'unavailable',
        message: 'Gemini CLI has Node.js compatibility issues',
        cli_version: version,
        authenticated: false,
        issue_type: 'compatibility_issue',
        solutions: [
          'Update Node.js to version 20+',
          'Use nvm to switch versions: nvm install 20 && nvm use 20',
          'Reinstall CLI after Node update',
          'This is a known issue with Node.js 18 and undici dependency'
        ],
        install_command: 'nvm install 20 && npm install -g @google/gemini-cli'
      }
    }

    // Default case - CLI exists but something went wrong
    return {
      provider: 'gemini_cli',
      status: 'unavailable',
      message: 'Gemini CLI installed but may have configuration issues',
      cli_version: version,
      authenticated: false,
      issue_type: 'environment_issue',
      solutions: [
        'Try running: gemini login',
        'Check your internet connection',
        'Verify Google AI API access',
        'Update CLI: npm update -g @google/gemini-cli'
      ],
      auth_command: 'gemini login'
    }
  } catch (error: any) {
    return {
      provider: 'gemini_cli',
      status: 'not_installed',
      message: `Error detecting Gemini CLI: ${error?.message || 'Unknown error'}`,
      issue_type: 'unknown',
      solutions: ['Try installing the CLI'],
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