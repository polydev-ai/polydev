/**
 * CLI Router - Unified routing layer for CLI-based model calling
 *
 * This module provides intelligent routing between CLI tools (using subscriptions)
 * and API-based calling (using API keys). It prioritizes CLI tools when available
 * to leverage users' existing subscriptions (Claude Pro, ChatGPT Plus, Gemini Advanced).
 *
 * Supported CLI tools:
 * - Claude Code CLI (claude) - Uses Anthropic/Claude subscription
 * - Codex CLI (codex) - Uses OpenAI/ChatGPT subscription
 * - Gemini CLI (gemini) - Uses Google/Gemini subscription
 */

import { spawn } from 'child_process'
import { SupabaseClient } from '@supabase/supabase-js'

// CLI Provider mapping
export const CLI_PROVIDER_MAP: Record<string, {
  cliTool: string
  command: string
  providers: string[]  // API providers this CLI can replace
  promptArg: string    // Argument to pass prompt
  modelArg: string     // Argument to specify model
}> = {
  claude_code: {
    cliTool: 'Claude Code',
    command: 'claude',
    providers: ['anthropic'],
    promptArg: '-p',        // claude -p "prompt"
    modelArg: '--model'     // claude --model claude-sonnet-4
  },
  codex_cli: {
    cliTool: 'Codex CLI',
    command: 'codex',
    providers: ['openai'],
    promptArg: '',          // codex "prompt" (positional)
    modelArg: '--model'     // codex --model gpt-4o "prompt"
  },
  gemini_cli: {
    cliTool: 'Gemini CLI',
    command: 'gemini',
    providers: ['google', 'gemini'],
    promptArg: '-p',        // gemini -p "prompt"
    modelArg: '-m'          // gemini -m gemini-2.5-pro
  }
}

// Reverse mapping: provider -> CLI
export const PROVIDER_TO_CLI: Record<string, string> = {
  'anthropic': 'claude_code',
  'openai': 'codex_cli',
  'google': 'gemini_cli',
  'gemini': 'gemini_cli'
}

export interface CLIRouterConfig {
  userId: string
  supabase: SupabaseClient
  preferCli?: boolean  // Default true - prefer CLI over API when available
}

export interface CLIStatus {
  provider: string
  available: boolean
  authenticated: boolean
  version?: string
  lastChecked?: Date
  error?: string
}

export interface RouteDecision {
  useCli: boolean
  cliProvider?: string
  reason: string
  fallbackToApi: boolean
}

export interface CLIExecutionResult {
  success: boolean
  content?: string
  error?: string
  tokensEstimated?: number
  executionTimeMs?: number
  cliProvider?: string
}

export class CLIRouter {
  private userId: string
  private supabase: SupabaseClient
  private preferCli: boolean
  private statusCache: Map<string, { status: CLIStatus; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(config: CLIRouterConfig) {
    this.userId = config.userId
    this.supabase = config.supabase
    this.preferCli = config.preferCli ?? true
  }

  /**
   * Determine whether to use CLI or API for a given provider
   */
  async routeRequest(
    apiProvider: string,
    model: string,
    options?: { forceCli?: boolean; forceApi?: boolean }
  ): Promise<RouteDecision> {
    // Force API if explicitly requested
    if (options?.forceApi) {
      return {
        useCli: false,
        reason: 'API explicitly requested',
        fallbackToApi: true
      }
    }

    // Get corresponding CLI for this provider
    const cliProvider = PROVIDER_TO_CLI[apiProvider.toLowerCase()]

    if (!cliProvider) {
      return {
        useCli: false,
        reason: `No CLI available for provider: ${apiProvider}`,
        fallbackToApi: true
      }
    }

    // Check if user prefers CLI
    if (!this.preferCli && !options?.forceCli) {
      return {
        useCli: false,
        reason: 'User prefers API over CLI',
        fallbackToApi: true
      }
    }

    // Check CLI status
    const cliStatus = await this.getCliStatus(cliProvider)

    if (!cliStatus.available) {
      return {
        useCli: false,
        cliProvider,
        reason: `${CLI_PROVIDER_MAP[cliProvider].cliTool} not installed`,
        fallbackToApi: true
      }
    }

    if (!cliStatus.authenticated) {
      return {
        useCli: false,
        cliProvider,
        reason: `${CLI_PROVIDER_MAP[cliProvider].cliTool} not authenticated`,
        fallbackToApi: true
      }
    }

    // Force CLI if explicitly requested and available
    if (options?.forceCli) {
      return {
        useCli: true,
        cliProvider,
        reason: 'CLI explicitly requested and available',
        fallbackToApi: false
      }
    }

    // Use CLI by default when available and authenticated
    return {
      useCli: true,
      cliProvider,
      reason: `Using ${CLI_PROVIDER_MAP[cliProvider].cliTool} (subscription-based)`,
      fallbackToApi: true
    }
  }

  /**
   * Execute a prompt through CLI
   */
  async executeCliPrompt(
    cliProvider: string,
    prompt: string,
    model?: string,
    timeoutMs: number = 60000
  ): Promise<CLIExecutionResult> {
    const startTime = Date.now()
    const cliConfig = CLI_PROVIDER_MAP[cliProvider]

    if (!cliConfig) {
      return {
        success: false,
        error: `Unknown CLI provider: ${cliProvider}`
      }
    }

    try {
      const args = this.buildCliArgs(cliProvider, prompt, model)
      const result = await this.spawnCliCommand(cliConfig.command, args, timeoutMs)

      const executionTimeMs = Date.now() - startTime

      if (result.success) {
        // Estimate tokens (rough: 4 chars per token)
        const tokensEstimated = Math.ceil((prompt.length + (result.stdout?.length || 0)) / 4)

        return {
          success: true,
          content: this.cleanCliOutput(result.stdout || ''),
          tokensEstimated,
          executionTimeMs,
          cliProvider
        }
      }

      return {
        success: false,
        error: result.stderr || result.error || 'CLI execution failed',
        executionTimeMs,
        cliProvider
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'CLI execution error',
        executionTimeMs: Date.now() - startTime,
        cliProvider
      }
    }
  }

  /**
   * Build CLI arguments for different tools
   */
  private buildCliArgs(cliProvider: string, prompt: string, model?: string): string[] {
    const config = CLI_PROVIDER_MAP[cliProvider]
    const args: string[] = []

    switch (cliProvider) {
      case 'claude_code':
        // claude -p "prompt" [--model model]
        if (model) {
          args.push(config.modelArg, model)
        }
        args.push(config.promptArg, prompt)
        break

      case 'codex_cli':
        // codex [--model model] "prompt"
        if (model) {
          args.push(config.modelArg, model)
        }
        args.push(prompt)
        break

      case 'gemini_cli':
        // gemini [-m model] -p "prompt"
        if (model) {
          args.push(config.modelArg, model)
        }
        args.push(config.promptArg, prompt)
        break

      default:
        args.push(prompt)
    }

    return args
  }

  /**
   * Spawn CLI command with timeout
   */
  private spawnCliCommand(
    command: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        env: {
          ...process.env,
          NO_COLOR: '1',        // Disable colored output
          CI: '1',              // Non-interactive mode
          TERM: 'dumb'          // Simple terminal
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
        resolve({
          success: false,
          stdout,
          stderr,
          error: `Command timed out after ${timeoutMs}ms`
        })
      }, timeoutMs)

      child.on('close', (code) => {
        clearTimeout(timeout)
        if (!killed) {
          resolve({
            success: code === 0,
            stdout,
            stderr,
            error: code !== 0 ? `Exit code: ${code}` : undefined
          })
        }
      })

      child.on('error', (error) => {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: error.message
        })
      })
    })
  }

  /**
   * Clean CLI output (remove ANSI codes, extra whitespace)
   */
  private cleanCliOutput(output: string): string {
    return output
      .replace(/\x1b\[[0-9;]*m/g, '')  // Remove ANSI escape codes
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Collapse multiple newlines
      .trim()
  }

  /**
   * Get CLI status (with caching)
   */
  async getCliStatus(cliProvider: string): Promise<CLIStatus> {
    // Check cache first
    const cached = this.statusCache.get(cliProvider)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.status
    }

    // Check database for stored status
    try {
      const { data } = await this.supabase
        .from('cli_provider_configurations')
        .select('*')
        .eq('user_id', this.userId)
        .eq('provider', cliProvider)
        .single()

      if (data) {
        const status: CLIStatus = {
          provider: cliProvider,
          available: data.status === 'available',
          authenticated: data.enabled && data.status === 'available',
          version: data.version,
          lastChecked: data.last_checked_at ? new Date(data.last_checked_at) : undefined
        }

        this.statusCache.set(cliProvider, { status, timestamp: Date.now() })
        return status
      }
    } catch (error) {
      console.error(`[CLIRouter] Error fetching CLI status for ${cliProvider}:`, error)
    }

    // Default: not available
    const defaultStatus: CLIStatus = {
      provider: cliProvider,
      available: false,
      authenticated: false
    }

    this.statusCache.set(cliProvider, { status: defaultStatus, timestamp: Date.now() })
    return defaultStatus
  }

  /**
   * Get all CLI statuses for user
   */
  async getAllCliStatuses(): Promise<Record<string, CLIStatus>> {
    const statuses: Record<string, CLIStatus> = {}

    for (const provider of Object.keys(CLI_PROVIDER_MAP)) {
      statuses[provider] = await this.getCliStatus(provider)
    }

    return statuses
  }

  /**
   * Check if any CLI is available for a given API provider
   */
  async hasAvailableCli(apiProvider: string): Promise<boolean> {
    const cliProvider = PROVIDER_TO_CLI[apiProvider.toLowerCase()]
    if (!cliProvider) return false

    const status = await this.getCliStatus(cliProvider)
    return status.available && status.authenticated
  }

  /**
   * Clear status cache
   */
  clearCache(provider?: string) {
    if (provider) {
      this.statusCache.delete(provider)
    } else {
      this.statusCache.clear()
    }
  }
}

// Singleton factory
let routerInstance: CLIRouter | null = null

export function getCLIRouter(config: CLIRouterConfig): CLIRouter {
  if (!routerInstance || routerInstance['userId'] !== config.userId) {
    routerInstance = new CLIRouter(config)
  }
  return routerInstance
}

export default CLIRouter
