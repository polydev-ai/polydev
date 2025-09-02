/**
 * CLI Integration for Polydev
 * Supports Claude Code, GitHub Copilot, Codex CLI, Gemini CLI, and OpenAI CLI
 * Tracks usage across all CLI tools for comprehensive billing
 */

import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export interface CLIConfig {
  toolName: string
  cliPath: string
  isDefault: boolean
  autoDetect: boolean
  enabled: boolean
  configOptions: Record<string, any>
  lastVerified?: Date
}

export interface CLIUsageSession {
  toolName: string
  modelName?: string
  messageCount: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costEstimate: number
  metadata: Record<string, any>
}

export class CLIIntegrationManager {
  private defaultPaths: Record<string, string[]> = {
    claude_code: [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      '~/.local/bin/claude',
      '/usr/bin/claude'
    ],
    github_copilot: [
      '/usr/local/bin/gh',
      '/opt/homebrew/bin/gh',
      '~/.local/bin/gh',
      '/usr/bin/gh'
    ],
    codex_cli: [
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
      '~/.local/bin/codex',
      '/usr/bin/codex'
    ],
    gemini_cli: [
      '/usr/local/bin/gemini',
      '/opt/homebrew/bin/gemini',
      '~/.local/bin/gemini',
      '/usr/bin/gemini'
    ],
    openai_cli: [
      '/usr/local/bin/openai',
      '/opt/homebrew/bin/openai',
      '~/.local/bin/openai',
      '/usr/bin/openai'
    ]
  }

  /**
   * Auto-detect available CLI tools on the system
   */
  async detectAvailableCLIs(): Promise<CLIConfig[]> {
    const configs: CLIConfig[] = []

    for (const [toolName, paths] of Object.entries(this.defaultPaths)) {
      try {
        // First try 'which' command
        const { stdout } = await execAsync(`which ${this.getCommandName(toolName)}`)
        const detectedPath = stdout.trim()
        
        if (detectedPath) {
          configs.push({
            toolName,
            cliPath: detectedPath,
            isDefault: true,
            autoDetect: true,
            enabled: true,
            configOptions: {},
            lastVerified: new Date()
          })
          continue
        }
      } catch (error) {
        // which command failed, try default paths
      }

      // Try each default path
      for (const defaultPath of paths) {
        const expandedPath = defaultPath.replace('~', process.env.HOME || '')
        if (fs.existsSync(expandedPath)) {
          configs.push({
            toolName,
            cliPath: expandedPath,
            isDefault: true,
            autoDetect: true,
            enabled: true,
            configOptions: {},
            lastVerified: new Date()
          })
          break
        }
      }
    }

    return configs
  }

  /**
   * Verify a CLI tool is working and authenticated
   */
  async verifyCLI(config: CLIConfig): Promise<boolean> {
    try {
      const command = this.getVerificationCommand(config.toolName)
      if (!command) return false

      const { stdout, stderr } = await execAsync(`${config.cliPath} ${command}`, {
        timeout: 10000 // 10 second timeout
      })

      // Tool-specific verification logic
      switch (config.toolName) {
        case 'claude_code':
          return !stderr.includes('not authenticated') && !stderr.includes('error')
        case 'github_copilot':
          return stdout.includes('✓') || !stderr.includes('not logged in')
        case 'codex_cli':
          return !stderr.includes('authentication') && !stderr.includes('error')
        case 'gemini_cli':
          return !stderr.includes('not authenticated') && !stderr.includes('error')
        case 'openai_cli':
          return stdout.includes('OpenAI') || !stderr.includes('authentication')
        default:
          return true
      }
    } catch (error) {
      console.warn(`CLI verification failed for ${config.toolName}:`, error)
      return false
    }
  }

  /**
   * Execute a CLI command and track usage
   */
  async executeCLICommand(
    config: CLIConfig,
    command: string,
    options: {
      model?: string
      timeout?: number
      trackUsage?: boolean
      userId?: string
    } = {}
  ): Promise<{
    success: boolean
    output?: string
    error?: string
    usage?: CLIUsageSession
  }> {
    try {
      const fullCommand = `${config.cliPath} ${command}`
      const startTime = Date.now()
      
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: options.timeout || 30000 // 30 second default timeout
      })

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Extract usage information from output
      const usage = this.extractUsageFromOutput(config.toolName, stdout, stderr, {
        model: options.model,
        executionTime,
        command
      })

      return {
        success: true,
        output: stdout,
        usage: options.trackUsage ? usage : undefined
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'CLI command execution failed'
      }
    }
  }

  /**
   * Monitor CLI usage by watching log files or process activity
   */
  async startUsageMonitoring(userId: string, configs: CLIConfig[]): Promise<void> {
    // This would typically involve:
    // 1. Setting up file watchers for CLI log files
    // 2. Monitoring process activity
    // 3. Parsing usage data from logs
    // 4. Reporting usage to the tracking system
    
    console.log(`Starting CLI usage monitoring for user ${userId}`)
    
    for (const config of configs) {
      if (!config.enabled) continue
      
      try {
        const logPath = this.getLogPath(config.toolName)
        if (logPath && fs.existsSync(logPath)) {
          // Set up file watcher
          fs.watchFile(logPath, { interval: 5000 }, (curr, prev) => {
            if (curr.mtime > prev.mtime) {
              this.processLogChanges(userId, config, logPath)
            }
          })
        }
      } catch (error) {
        console.warn(`Failed to monitor ${config.toolName}:`, error)
      }
    }
  }

  private getCommandName(toolName: string): string {
    const commands: Record<string, string> = {
      claude_code: 'claude',
      github_copilot: 'gh',
      codex_cli: 'codex',
      gemini_cli: 'gemini',
      openai_cli: 'openai'
    }
    return commands[toolName] || toolName
  }

  private getVerificationCommand(toolName: string): string | null {
    const commands: Record<string, string> = {
      claude_code: '--version',
      github_copilot: 'auth status',
      codex_cli: '--version',
      gemini_cli: '--version',
      openai_cli: '--version'
    }
    return commands[toolName] || null
  }

  private extractUsageFromOutput(
    toolName: string,
    stdout: string,
    stderr: string,
    context: {
      model?: string
      executionTime: number
      command: string
    }
  ): CLIUsageSession {
    // Basic usage extraction - would be enhanced for each tool
    let modelName = context.model || 'unknown'
    let inputTokens = Math.ceil(context.command.length / 4)
    let outputTokens = Math.ceil(stdout.length / 4)
    let costEstimate = 0.1 // Default estimate

    // Tool-specific parsing
    switch (toolName) {
      case 'claude_code':
        // Look for Claude-specific usage patterns
        const claudeModelMatch = stdout.match(/Model:\s*([^\n]+)/)
        if (claudeModelMatch) modelName = claudeModelMatch[1]
        break
      
      case 'github_copilot':
        // GitHub Copilot usage patterns
        modelName = 'copilot-chat'
        costEstimate = 0.05 // Lower cost for Copilot
        break
      
      case 'codex_cli':
        // Codex CLI patterns
        const codexModelMatch = stdout.match(/model:\s*([^\n]+)/)
        if (codexModelMatch) modelName = codexModelMatch[1]
        break
    }

    return {
      toolName,
      modelName,
      messageCount: 1,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costEstimate,
      metadata: {
        executionTime: context.executionTime,
        command: context.command,
        outputLength: stdout.length,
        hasError: stderr.length > 0
      }
    }
  }

  private getLogPath(toolName: string): string | null {
    const logPaths: Record<string, string> = {
      claude_code: '~/.claude/logs/activity.log',
      github_copilot: '~/.config/github-copilot/logs/extension.log',
      codex_cli: '~/.config/codex/logs/usage.log',
      gemini_cli: '~/.config/gemini/logs/activity.log',
      openai_cli: '~/.config/openai/logs/usage.log'
    }
    
    const logPath = logPaths[toolName]
    return logPath ? logPath.replace('~', process.env.HOME || '') : null
  }

  private async processLogChanges(userId: string, config: CLIConfig, logPath: string): Promise<void> {
    try {
      // Read new log entries and extract usage information
      // This would be implemented based on each CLI's log format
      console.log(`Processing log changes for ${config.toolName} at ${logPath}`)
      
      // Example: Parse recent log entries and report usage
      // const usage = await this.parseLogEntries(logPath)
      // if (usage) {
      //   await this.reportUsage(userId, usage)
      // }
    } catch (error) {
      console.warn(`Failed to process log changes for ${config.toolName}:`, error)
    }
  }
}

export default CLIIntegrationManager