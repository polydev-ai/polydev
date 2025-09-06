'use client'

/**
 * Client-side CLI Validation Service
 * 
 * This service runs in the browser and can spawn local processes
 * to validate CLI tools, then report back to the serverless API.
 * Triggered during authentication flows for seamless UX.
 */

interface CLIValidationResult {
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli'
  status: 'available' | 'unavailable' | 'not_installed'
  message: string
  cli_version?: string
  authenticated?: boolean
  error?: string
}

interface CLIValidationOptions {
  userId: string
  mcpToken: string
  apiUrl?: string
  onProgress?: (provider: string, status: string) => void
  onComplete?: (results: CLIValidationResult[]) => void
}

class CLIValidationService {
  private apiUrl: string
  private isValidating = false

  constructor(apiUrl = '/api/cli-status-update') {
    this.apiUrl = apiUrl
  }

  /**
   * Check if we're in a client environment that can spawn processes
   */
  private canRunLocalValidation(): boolean {
    return typeof window !== 'undefined' && 
           typeof navigator !== 'undefined' &&
           // Check if we have access to local execution (Electron, Tauri, etc.)
           !!(window as any).electronAPI || 
           !!(window as any).__TAURI__ ||
           // Or if we're in a desktop browser with file system access
           typeof (window as any).showDirectoryPicker === 'function'
  }

  /**
   * Execute CLI command using available client-side APIs
   */
  private async executeCommand(command: string, args: string[]): Promise<{
    success: boolean
    stdout?: string
    stderr?: string
    error?: string
  }> {
    try {
      // Method 1: Electron API
      if ((window as any).electronAPI) {
        return await (window as any).electronAPI.executeCommand(command, args)
      }

      // Method 2: Tauri API
      if ((window as any).__TAURI__) {
        const { Command } = (window as any).__TAURI__.shell
        const cmd = new Command(command, args)
        const result = await cmd.execute()
        return {
          success: result.code === 0,
          stdout: result.stdout,
          stderr: result.stderr
        }
      }

      // Method 3: Web-based validation (limited)
      // For browser-only environments, we can't spawn processes
      // Instead, we guide users through re-authentication flow
      return {
        success: false,
        error: 'Browser environment detected - CLI validation requires desktop app or re-authentication'
      }

    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to execute command'
      }
    }
  }

  /**
   * Validate Claude Code CLI
   */
  private async validateClaudeCode(): Promise<CLIValidationResult> {
    try {
      // Check version
      const versionResult = await this.executeCommand('claude', ['--version'])
      
      if (!versionResult.success) {
        return {
          provider: 'claude_code',
          status: 'not_installed',
          message: 'Claude Code CLI not found. Please install: npm install -g @anthropic-ai/claude-code'
        }
      }

      // Check authentication
      const authResult = await this.executeCommand('claude', ['auth', 'status'])
      const isAuthenticated = authResult.success && 
        !authResult.stderr?.includes('not authenticated') &&
        !authResult.stderr?.includes('Please login')

      return {
        provider: 'claude_code',
        status: isAuthenticated ? 'available' : 'unavailable',
        message: isAuthenticated 
          ? 'Claude Code CLI authenticated and ready'
          : 'Claude Code CLI requires authentication. Run: claude auth login',
        cli_version: versionResult.stdout?.trim(),
        authenticated: isAuthenticated
      }

    } catch (error: any) {
      return {
        provider: 'claude_code',
        status: 'not_installed',
        message: `Error validating Claude Code: ${error?.message || 'Unknown error'}`,
        error: error?.message
      }
    }
  }

  /**
   * Validate Codex CLI
   */
  private async validateCodexCli(): Promise<CLIValidationResult> {
    try {
      const versionResult = await this.executeCommand('codex', ['--version'])
      
      if (!versionResult.success) {
        return {
          provider: 'codex_cli',
          status: 'not_installed',
          message: 'Codex CLI not found. Please install from OpenAI'
        }
      }

      const authResult = await this.executeCommand('codex', ['auth', 'status'])
      const isAuthenticated = authResult.success && 
        !authResult.stderr?.includes('not authenticated') &&
        !authResult.stdout?.includes('Please login')

      return {
        provider: 'codex_cli',
        status: isAuthenticated ? 'available' : 'unavailable',
        message: isAuthenticated 
          ? 'Codex CLI authenticated and ready'
          : 'Codex CLI requires authentication. Run: codex auth',
        cli_version: versionResult.stdout?.trim(),
        authenticated: isAuthenticated
      }

    } catch (error: any) {
      return {
        provider: 'codex_cli',
        status: 'not_installed',
        message: `Error validating Codex CLI: ${error?.message || 'Unknown error'}`,
        error: error?.message
      }
    }
  }

  /**
   * Validate Gemini CLI
   */
  private async validateGeminiCli(): Promise<CLIValidationResult> {
    try {
      const versionResult = await this.executeCommand('gemini', ['--version'])
      
      if (!versionResult.success) {
        return {
          provider: 'gemini_cli',
          status: 'not_installed',
          message: 'Gemini CLI not found. Please install from Google'
        }
      }

      const authResult = await this.executeCommand('gemini', ['auth', 'status'])
      const isAuthenticated = authResult.success && 
        !authResult.stderr?.includes('not authenticated') &&
        !authResult.stdout?.includes('Please login')

      return {
        provider: 'gemini_cli',
        status: isAuthenticated ? 'available' : 'unavailable',
        message: isAuthenticated 
          ? 'Gemini CLI authenticated and ready'
          : 'Gemini CLI requires authentication. Run: gemini auth login',
        cli_version: versionResult.stdout?.trim(),
        authenticated: isAuthenticated
      }

    } catch (error: any) {
      return {
        provider: 'gemini_cli',
        status: 'not_installed',
        message: `Error validating Gemini CLI: ${error?.message || 'Unknown error'}`,
        error: error?.message
      }
    }
  }

  /**
   * Report validation result to server
   */
  private async reportToServer(
    result: CLIValidationResult, 
    userId: string, 
    mcpToken: string
  ): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...result,
          user_id: userId,
          mcp_token: mcpToken
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      console.log(`✅ CLI status reported: ${result.provider} = ${result.status}`)
      
    } catch (error: any) {
      console.error(`❌ Failed to report ${result.provider} status:`, error?.message)
    }
  }

  /**
   * Validate all CLI tools and report to server
   */
  async validateAllCLIs(options: CLIValidationOptions): Promise<CLIValidationResult[]> {
    if (this.isValidating) {
      console.log('CLI validation already in progress')
      return []
    }

    this.isValidating = true
    const results: CLIValidationResult[] = []

    try {
      console.log('🔍 Starting CLI validation...')

      // Check if we can run local validation
      if (!this.canRunLocalValidation()) {
        // For browser environments, trigger re-authentication flow
        return await this.triggerReAuthenticationFlow(options)
      }

      const validationTasks = [
        { name: 'claude_code', validator: () => this.validateClaudeCode() },
        { name: 'codex_cli', validator: () => this.validateCodexCli() },
        { name: 'gemini_cli', validator: () => this.validateGeminiCli() }
      ]

      // Run validations sequentially to avoid overwhelming the system
      for (const task of validationTasks) {
        try {
          options.onProgress?.(task.name, 'checking')
          
          const result = await task.validator()
          results.push(result)
          
          // Report to server immediately
          await this.reportToServer(result, options.userId, options.mcpToken)
          
          options.onProgress?.(task.name, result.status)
          
          // Small delay between checks
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error: any) {
          console.error(`Error validating ${task.name}:`, error)
          const errorResult: CLIValidationResult = {
            provider: task.name as any,
            status: 'not_installed',
            message: `Validation failed: ${error?.message || 'Unknown error'}`,
            error: error?.message
          }
          results.push(errorResult)
          await this.reportToServer(errorResult, options.userId, options.mcpToken)
        }
      }

      console.log('✅ CLI validation completed')
      options.onComplete?.(results)
      return results

    } finally {
      this.isValidating = false
    }
  }

  /**
   * Trigger re-authentication flow for browser environments
   */
  private async triggerReAuthenticationFlow(options: CLIValidationOptions): Promise<CLIValidationResult[]> {
    console.log('🌐 Browser environment detected - triggering re-authentication flow')
    
    // Create a special window or modal that guides users through CLI validation
    const validationWindow = await this.createValidationWindow(options)
    
    return new Promise((resolve, reject) => {
      // Set up message listener for validation results
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'CLI_VALIDATION_COMPLETE') {
          window.removeEventListener('message', messageHandler)
          resolve(event.data.results)
        } else if (event.data.type === 'CLI_VALIDATION_ERROR') {
          window.removeEventListener('message', messageHandler)
          reject(new Error(event.data.error))
        }
      }
      
      window.addEventListener('message', messageHandler)
      
      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageHandler)
        reject(new Error('CLI validation timeout'))
      }, 5 * 60 * 1000)
    })
  }

  /**
   * Create validation window for browser environments
   */
  private async createValidationWindow(options: CLIValidationOptions): Promise<Window | null> {
    const validationUrl = `/cli-validation?userId=${options.userId}&mcpToken=${options.mcpToken}`
    
    const popup = window.open(
      validationUrl,
      'cli-validation',
      'width=600,height=800,scrollbars=yes,resizable=yes'
    )

    return popup
  }

  /**
   * Get CLI validation status from server
   */
  async getCLIStatus(userId: string): Promise<Record<string, any>> {
    try {
      const response = await fetch('/api/cli-status')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
      
    } catch (error: any) {
      console.error('Failed to get CLI status:', error)
      return {}
    }
  }
}

// Export singleton instance
export const cliValidationService = new CLIValidationService()

// Export types
export type { CLIValidationResult, CLIValidationOptions }