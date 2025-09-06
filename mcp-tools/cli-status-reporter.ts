#!/usr/bin/env node

/**
 * MCP Tool: CLI Status Reporter
 * 
 * This tool runs locally in user's MCP client (Cursor, Claude Code, etc.)
 * and reports CLI tool status back to the Polydev web application.
 * 
 * Usage: Add this tool to your local MCP bridge configuration
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

interface CLIStatusReport {
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli';
  status: 'available' | 'unavailable' | 'not_installed';
  message: string;
  cli_version?: string;
  cli_path?: string;
  authenticated?: boolean;
  last_used?: string;
  additional_info?: Record<string, any>;
}

class CLIStatusReporter {
  private mcpToken: string;
  private apiUrl: string;
  private userId: string;

  constructor() {
    this.mcpToken = process.env.POLYDEV_MCP_TOKEN || '';
    this.apiUrl = process.env.POLYDEV_API_URL || 'https://polydev.com/api/cli-status-update';
    this.userId = process.env.POLYDEV_USER_ID || '';
    
    if (!this.mcpToken) {
      console.error('POLYDEV_MCP_TOKEN environment variable is required');
      process.exit(1);
    }
  }

  /**
   * Check Claude Code CLI status
   */
  async checkClaudeCodeStatus(): Promise<CLIStatusReport> {
    try {
      // Check if Claude Code CLI is installed
      const versionResult = await this.executeCommand('claude', ['--version']);
      
      if (versionResult.error) {
        return {
          provider: 'claude_code',
          status: 'not_installed',
          message: 'Claude Code CLI is not installed or not in PATH'
        };
      }

      // Check authentication status
      const authResult = await this.executeCommand('claude', ['auth', 'status']);
      const isAuthenticated = !authResult.stderr.includes('not authenticated') && 
                             !authResult.stderr.includes('Please login');

      return {
        provider: 'claude_code',
        status: isAuthenticated ? 'available' : 'unavailable',
        message: isAuthenticated ? 'Claude Code CLI is authenticated and ready' : 'Claude Code CLI requires authentication',
        cli_version: versionResult.stdout.trim(),
        authenticated: isAuthenticated,
        last_used: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        provider: 'claude_code',
        status: 'not_installed',
        message: `Error checking Claude Code CLI: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Check Codex CLI status
   */
  async checkCodexCliStatus(): Promise<CLIStatusReport> {
    try {
      // Check if Codex CLI is installed
      const versionResult = await this.executeCommand('codex', ['--version']);
      
      if (versionResult.error) {
        return {
          provider: 'codex_cli',
          status: 'not_installed',
          message: 'Codex CLI is not installed or not in PATH'
        };
      }

      // Check authentication status
      const authResult = await this.executeCommand('codex', ['auth', 'status']);
      const isAuthenticated = !authResult.stderr.includes('not authenticated') && 
                             !authResult.stdout.includes('Please login');

      return {
        provider: 'codex_cli',
        status: isAuthenticated ? 'available' : 'unavailable',
        message: isAuthenticated ? 'Codex CLI is authenticated and ready' : 'Codex CLI requires authentication',
        cli_version: versionResult.stdout.trim(),
        authenticated: isAuthenticated,
        last_used: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        provider: 'codex_cli',
        status: 'not_installed',
        message: `Error checking Codex CLI: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Check Gemini CLI status
   */
  async checkGeminiCliStatus(): Promise<CLIStatusReport> {
    try {
      // Check if Gemini CLI is installed
      const versionResult = await this.executeCommand('gemini', ['--version']);
      
      if (versionResult.error) {
        return {
          provider: 'gemini_cli',
          status: 'not_installed',
          message: 'Gemini CLI is not installed or not in PATH'
        };
      }

      // Check authentication status
      const authResult = await this.executeCommand('gemini', ['auth', 'status']);
      const isAuthenticated = !authResult.stderr.includes('not authenticated') && 
                             !authResult.stdout.includes('Please login');

      return {
        provider: 'gemini_cli',
        status: isAuthenticated ? 'available' : 'unavailable',
        message: isAuthenticated ? 'Gemini CLI is authenticated and ready' : 'Gemini CLI requires authentication',
        cli_version: versionResult.stdout.trim(),
        authenticated: isAuthenticated,
        last_used: new Date().toISOString()
      };

    } catch (error: any) {
      return {
        provider: 'gemini_cli',
        status: 'not_installed',
        message: `Error checking Gemini CLI: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Report CLI status to Polydev web app
   */
  async reportStatus(statusReport: CLIStatusReport): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...statusReport,
          user_id: this.userId,
          mcp_token: this.mcpToken
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log(`✅ Status reported for ${statusReport.provider}: ${statusReport.status}`);
      
    } catch (error: any) {
      console.error(`❌ Failed to report status for ${statusReport.provider}:`, error?.message || 'Unknown error');
    }
  }

  /**
   * Check all CLI tools and report their status
   */
  async checkAndReportAllStatus(): Promise<void> {
    console.log('🔍 Checking CLI tool status...');
    
    const checks = [
      this.checkClaudeCodeStatus(),
      this.checkCodexCliStatus(),
      this.checkGeminiCliStatus()
    ];

    const results = await Promise.all(checks);
    
    // Report each status
    for (const result of results) {
      await this.reportStatus(result);
    }

    console.log('✅ All CLI status checks completed');
  }

  /**
   * Execute a command and capture output
   */
  private executeCommand(command: string, args: string[]): Promise<{stdout: string, stderr: string, error?: Error}> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { shell: true });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          resolve({
            stdout,
            stderr,
            error: new Error(`Command failed with code ${code}`)
          });
        } else {
          resolve({ stdout, stderr });
        }
      });

      child.on('error', (error) => {
        resolve({
          stdout,
          stderr,
          error
        });
      });
    });
  }
}

// MCP Tool Definitions for local bridges
export const mcpTools = [
  {
    name: "report_cli_status",
    description: "Check and report CLI tool status to Polydev web application",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          enum: ["claude_code", "codex_cli", "gemini_cli", "all"],
          description: "CLI provider to check, or 'all' for all providers"
        }
      },
      required: ["provider"]
    }
  },
  {
    name: "setup_cli_monitoring",
    description: "Set up automated CLI status monitoring",
    inputSchema: {
      type: "object",
      properties: {
        interval_minutes: {
          type: "number",
          description: "How often to check CLI status (in minutes)",
          default: 15
        },
        enabled: {
          type: "boolean",
          description: "Enable/disable automatic monitoring",
          default: true
        }
      }
    }
  }
];

// Tool handler functions for MCP
export async function handleReportCliStatus(args: { provider: string }) {
  const reporter = new CLIStatusReporter();
  
  if (args.provider === 'all') {
    await reporter.checkAndReportAllStatus();
    return { success: true, message: "Checked and reported status for all CLI tools" };
  }
  
  let statusReport: CLIStatusReport;
  
  switch (args.provider) {
    case 'claude_code':
      statusReport = await reporter.checkClaudeCodeStatus();
      break;
    case 'codex_cli':
      statusReport = await reporter.checkCodexCliStatus();
      break;
    case 'gemini_cli':
      statusReport = await reporter.checkGeminiCliStatus();
      break;
    default:
      return { error: `Unknown provider: ${args.provider}` };
  }
  
  await reporter.reportStatus(statusReport);
  return { success: true, statusReport };
}

// Auto-run if called directly
if (require.main === module) {
  const reporter = new CLIStatusReporter();
  reporter.checkAndReportAllStatus().catch(console.error);
}