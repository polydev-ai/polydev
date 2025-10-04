/**
 * CLI Manager with MCP Server Integration
 * Handles detection, authentication, and prompt sending for Claude Code, Codex CLI, and Gemini CLI
 * Uses MCP servers for database operations and status reporting
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
const which = require('which')
const shell = require('shelljs')

const execAsync = promisify(exec)

export interface CLIProvider {
  id: 'claude_code' | 'codex_cli' | 'gemini_cli'
  name: string
  executable: string
  versionCommand: string
  authCheckCommand: string
  chatCommand: string
  supportsStdin: boolean
  supportsArgs: boolean
  installInstructions: string
  authInstructions: string
}

export interface CLIStatus {
  available: boolean
  authenticated: boolean
  version?: string
  path?: string
  lastChecked: Date
  error?: string
  default_model?: string
  available_models?: string[]
  model_detection_method?: 'interactive' | 'fallback'
}

export interface CLIResponse {
  success: boolean
  content?: string
  error?: string
  tokensUsed?: number
  latencyMs?: number
}

export class CLIManager {
  private providers: Map<string, CLIProvider> = new Map()
  private statusCache: Map<string, CLIStatus> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    const providers: CLIProvider[] = [
      {
        id: 'claude_code',
        name: 'Claude Code',
        executable: 'claude',
        versionCommand: 'claude --version',
        authCheckCommand: 'claude auth status',
        chatCommand: 'claude chat',
        supportsStdin: true,
        supportsArgs: true,
        installInstructions: 'Install via: npm install -g @anthropic-ai/claude-code',
        authInstructions: 'Authenticate with: claude auth login'
      },
      {
        id: 'codex_cli',
        name: 'Codex CLI',
        executable: 'codex',
        versionCommand: 'codex --version',
        authCheckCommand: 'codex auth status',
        chatCommand: 'codex chat',
        supportsStdin: true,
        supportsArgs: true,
        installInstructions: 'Install Codex CLI from OpenAI',
        authInstructions: 'Authenticate with: codex auth'
      },
      {
        id: 'gemini_cli',
        name: 'Gemini CLI',
        executable: 'gemini',
        versionCommand: 'gemini --version',
        authCheckCommand: 'gemini auth status',
        chatCommand: 'gemini chat',
        supportsStdin: true,
        supportsArgs: true,
        installInstructions: 'Install Gemini CLI from Google',
        authInstructions: 'Authenticate with: gemini auth login'
      }
    ]

    providers.forEach(provider => {
      this.providers.set(provider.id, provider)
    })
  }

  /**
   * Force CLI detection for all providers or specific provider
   * Updates status cache and reports to MCP server via Supabase
   */
  async forceCliDetection(userId?: string, providerId?: string): Promise<Record<string, CLIStatus>> {
    console.log(`[CLI Manager] Force detection started for ${providerId || 'all providers'}`)
    const results: Record<string, CLIStatus> = {}

    const providersToCheck = providerId ? [providerId] : Array.from(this.providers.keys())

    for (const id of providersToCheck) {
      const provider = this.providers.get(id)
      if (!provider) continue

      try {
        const status = await this.detectCLI(provider)
        this.statusCache.set(id, status)
        results[id] = status

        // Update database via MCP Supabase if userId provided
        if (userId) {
          await this.updateCliStatusInDatabase(userId, id, status)
        }

        console.log(`[CLI Manager] ${provider.name}: ${status.available ? 'Available' : 'Not Available'}`)
      } catch (error) {
        console.error(`[CLI Manager] Error detecting ${provider.name}:`, error)
        const errorStatus: CLIStatus = {
          available: false,
          authenticated: false,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        this.statusCache.set(id, errorStatus)
        results[id] = errorStatus
      }
    }

    return results
  }

  /**
   * Get CLI status with cache support
   */
  async getCliStatus(providerId: string, userId?: string): Promise<CLIStatus> {
    const cached = this.statusCache.get(providerId)
    const now = new Date()

    // Return cached result if still valid
    if (cached && (now.getTime() - cached.lastChecked.getTime()) < this.cacheTimeout) {
      return cached
    }

    // Force detection if cache is stale or missing
    const results = await this.forceCliDetection(userId, providerId)
    return results[providerId] || {
      available: false,
      authenticated: false,
      lastChecked: now,
      error: 'Provider not found'
    }
  }

  /**
   * Send prompt to CLI provider
   */
  async sendCliPrompt(
    providerId: string,
    prompt: string,
    mode: 'stdin' | 'args' = 'args',
    timeoutMs: number = 30000
  ): Promise<CLIResponse> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      return {
        success: false,
        error: `Unknown CLI provider: ${providerId}`
      }
    }

    // Check if CLI is available and authenticated
    const status = await this.getCliStatus(providerId)
    if (!status.available) {
      return {
        success: false,
        error: `${provider.name} is not available. ${provider.installInstructions}`
      }
    }

    if (!status.authenticated) {
      return {
        success: false,
        error: `${provider.name} is not authenticated. ${provider.authInstructions}`
      }
    }

    const startTime = Date.now()

    try {
      let result: string

      if (mode === 'stdin' && provider.supportsStdin) {
        result = await this.sendPromptViaStdin(provider, prompt, timeoutMs)
      } else if (mode === 'args' && provider.supportsArgs) {
        result = await this.sendPromptViaArgs(provider, prompt, timeoutMs)
      } else {
        return {
          success: false,
          error: `${provider.name} does not support ${mode} mode`
        }
      }

      const latencyMs = Date.now() - startTime

      return {
        success: true,
        content: result,
        latencyMs
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CLI execution failed',
        latencyMs: Date.now() - startTime
      }
    }
  }

  /**
   * Detect CLI installation and authentication
   */
  private async detectCLI(provider: CLIProvider): Promise<CLIStatus> {
    const customPath = process.env[`${provider.id.toUpperCase()}_PATH`]
    let executablePath: string

    try {
      // Try custom path first, then system PATH
      if (customPath && fs.existsSync(customPath)) {
        executablePath = customPath
      } else {
        executablePath = await which(provider.executable)
      }
    } catch (error) {
      return {
        available: false,
        authenticated: false,
        lastChecked: new Date(),
        error: `${provider.name} not found in PATH. ${provider.installInstructions}`
      }
    }

    // Check version
    let version: string
    try {
      const { stdout } = await execAsync(provider.versionCommand, { timeout: 10000 })
      version = stdout.trim()
    } catch (error) {
      return {
        available: false,
        authenticated: false,
        lastChecked: new Date(),
        path: executablePath,
        error: `Failed to get ${provider.name} version`
      }
    }

    // Check authentication
    let authenticated = false
    try {
      const { stdout, stderr } = await execAsync(provider.authCheckCommand, { timeout: 10000 })
      // Look for success indicators in output
      const output = (stdout + stderr).toLowerCase()
      authenticated = output.includes('authenticated') || 
                     output.includes('logged in') || 
                     output.includes('valid') ||
                     !output.includes('not authenticated')
    } catch (error) {
      // Some CLIs might not have auth status command, assume authenticated if version works
      authenticated = true
    }

    // Detect available models for this CLI tool
    let default_model: string | undefined
    let available_models: string[] | undefined
    let model_detection_method: 'interactive' | 'fallback' | undefined

    try {
      const modelDetection = await this.detectDefaultModel(provider.id);
      default_model = modelDetection.defaultModel;
      available_models = modelDetection.availableModels;
      model_detection_method = modelDetection.detectionMethod;
    } catch (error) {
      console.error(`[CLI Manager] Model detection failed for ${provider.name}:`, error);
      // Continue without model info - fallback will be used
    }

    return {
      available: true,
      authenticated,
      version,
      path: executablePath,
      lastChecked: new Date(),
      default_model,
      available_models,
      model_detection_method
    }
  }

  /**
   * Send prompt via stdin mode
   */
  private async sendPromptViaStdin(
    provider: CLIProvider,
    prompt: string,
    timeoutMs: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(provider.chatCommand, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs
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
          resolve(stdout.trim())
        } else {
          reject(new Error(`CLI exited with code ${code}: ${stderr}`))
        }
      })

      child.on('error', (error) => {
        reject(error)
      })

      // Send prompt via stdin
      if (child.stdin) {
        child.stdin.write(prompt)
        child.stdin.end()
      }
    })
  }

  /**
   * Send prompt via command arguments
   */
  private async sendPromptViaArgs(
    provider: CLIProvider,
    prompt: string,
    timeoutMs: number
  ): Promise<string> {
    const command = `${provider.chatCommand} "${prompt.replace(/"/g, '\\"')}"`
    
    try {
      const { stdout } = await execAsync(command, { timeout: timeoutMs })
      return stdout.trim()
    } catch (error) {
      throw new Error(`CLI command failed: ${error}`)
    }
  }

  /**
   * Update CLI status in database using MCP Supabase server
   * This integrates with existing MCP infrastructure
   */
  private async updateCliStatusInDatabase(
    userId: string,
    providerId: string,
    status: CLIStatus
  ): Promise<void> {
    try {
      // Use existing CLI status API endpoint with MCP Supabase integration
      const statusUpdate = {
        server: this.getServerNameForProvider(providerId),
        tool: 'cli_detection',
        args: {
          provider: providerId,
          available: status.available,
          authenticated: status.authenticated,
          version: status.version,
          path: status.path,
          error: status.error
        }
      }

      // Call existing API endpoint that has MCP Supabase integration
      const response = await fetch('/api/cli-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'polydev-cli-manager/1.0.0'
        },
        body: JSON.stringify(statusUpdate)
      })

      if (!response.ok) {
        throw new Error(`Failed to update CLI status: ${response.status}`)
      }

      const result = await response.json()
      console.log(`[CLI Manager] Updated database via MCP Supabase for ${providerId}: ${status.available}`)
      
    } catch (error) {
      console.error(`[CLI Manager] Failed to update database via MCP Supabase:`, error)
    }
  }

  /**
   * Map provider ID to server name for MCP integration
   */
  private getServerNameForProvider(providerId: string): string {
    const serverMap = {
      'claude_code': 'claude-code-cli-bridge',
      'codex_cli': 'cross-llm-bridge-test',
      'gemini_cli': 'gemini-cli-bridge'
    }
    return serverMap[providerId as keyof typeof serverMap] || 'unknown-cli-bridge'
  }

  /**
   * Get all CLI providers configuration
   */
  getProviders(): CLIProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): CLIProvider | undefined {
    return this.providers.get(providerId)
  }

  /**
   * Detect available models for a CLI provider using interactive commands
   */
  async detectDefaultModel(providerId: string): Promise<{
    defaultModel: string;
    availableModels: string[];
    detectionMethod: 'interactive' | 'fallback';
  }> {
    try {
      // Try interactive detection using CLI commands
      let command = '';
      switch (providerId) {
        case 'claude_code':
          command = 'models'; // Claude Code model listing command
          break;
        case 'codex_cli':
          command = 'list-models'; // Codex CLI model listing command
          break;
        case 'gemini_cli':
          command = 'models'; // Gemini CLI model listing command
          break;
      }
      
      if (!command) {
        throw new Error(`No model detection command for ${providerId}`);
      }
      
      const result = await this.sendCliPrompt(providerId, command, 'args', 10000);
      
      if (result.success && result.content) {
        const models = this.parseModelsFromOutput(providerId, result.content);
        if (models.length > 0) {
          return {
            defaultModel: this.extractDefaultModel(providerId, models),
            availableModels: models,
            detectionMethod: 'interactive'
          };
        }
      }
    } catch (error) {
      console.error(`Interactive model detection failed for ${providerId}:`, error);
    }

    // Fallback to known defaults if interactive detection fails
    return {
      defaultModel: this.getDefaultModelFallback(providerId),
      availableModels: [this.getDefaultModelFallback(providerId)],
      detectionMethod: 'fallback'
    };
  }

  /**
   * Parse model names from CLI output
   */
  private parseModelsFromOutput(providerId: string, output: string): string[] {
    const models: string[] = [];
    const lines = output.split('\n');
    
    switch (providerId) {
      case 'claude_code':
        // Parse Claude Code output format
        lines.forEach(line => {
          const matches = line.match(/claude-[\w\-.]+/gi);
          if (matches) models.push(...matches);
        });
        break;
      case 'codex_cli':
        // Parse Codex CLI output format
        lines.forEach(line => {
          const matches = line.match(/gpt-[\w\-.]+|o1-[\w\-.]+/gi);
          if (matches) models.push(...matches);
        });
        break;
      case 'gemini_cli':
        // Parse Gemini CLI output format
        lines.forEach(line => {
          const matches = line.match(/gemini-[\w\-.]+/gi);
          if (matches) models.push(...matches);
        });
        break;
    }
    
    return [...new Set(models)]; // Remove duplicates
  }

  /**
   * Extract the default model from available models
   */
  private extractDefaultModel(providerId: string, models: string[]): string {
    if (models.length === 0) return this.getDefaultModelFallback(providerId);
    
    switch (providerId) {
      case 'claude_code':
        // Prefer Claude 3.5 Sonnet, then Claude 3 Sonnet
        return models.find(m => m.includes('claude-3-5-sonnet')) || 
               models.find(m => m.includes('claude-3-sonnet')) || 
               models[0];
      case 'codex_cli':
        // Prefer GPT-4, then GPT-3.5
        return models.find(m => m.includes('gpt-4')) || models[0];
      case 'gemini_cli':
        // Prefer Gemini Pro, then Gemini Flash
        return models.find(m => m.includes('gemini-1.5-pro')) || 
               models.find(m => m.includes('gemini-pro')) || 
               models[0];
    }
    return models[0];
  }

  /**
   * Get fallback default model for a provider
   */
  private getDefaultModelFallback(providerId: string): string {
    const fallbacks = {
      'claude_code': 'claude-3-sonnet',
      'codex_cli': 'gpt-4', 
      'gemini_cli': 'gemini-pro'
    };
    return fallbacks[providerId as keyof typeof fallbacks] || 'unknown';
  }
}

export default CLIManager
