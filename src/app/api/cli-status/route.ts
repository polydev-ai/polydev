import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { exec } from 'child_process'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

// Function to call MCP bridge for real CLI validation
async function callMCPBridge(bridgePath: string, tool: string): Promise<{
  success: boolean
  result: string
  available: boolean
  error?: string
}> {
  return new Promise((resolve) => {
    console.log(`[MCP Bridge] Calling ${bridgePath} with tool: ${tool}`)
    
    // Prepare MCP request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: tool,
        arguments: {}
      }
    }
    
    const child = spawn('python3', [bridgePath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let stdout = ''
    let stderr = ''
    
    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    // Send initialization request first
    const initRequest = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'polydev-dashboard',
          version: '1.0.0'
        }
      }
    }
    
    child.stdin.write(JSON.stringify(initRequest) + '\n')
    child.stdin.write(JSON.stringify(mcpRequest) + '\n')
    child.stdin.end()
    
    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({
        success: false,
        result: 'Timeout: CLI check took too long',
        available: false,
        error: 'Timeout'
      })
    }, 15000) // 15 second timeout
    
    child.on('close', (code) => {
      clearTimeout(timeout)
      
      console.log(`[MCP Bridge] Process exited with code: ${code}`)
      console.log(`[MCP Bridge] stdout: ${stdout}`)
      console.log(`[MCP Bridge] stderr: ${stderr}`)
      
      if (code !== 0) {
        resolve({
          success: false,
          result: `MCP bridge failed with code ${code}`,
          available: false,
          error: stderr || `Process exited with code ${code}`
        })
        return
      }
      
      // Parse MCP response
      try {
        const lines = stdout.split('\n').filter(line => line.trim())
        let toolResult = null
        
        // Look for the tool call response
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.id === 1 && parsed.result) {
              toolResult = parsed.result
              break
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }
        
        if (toolResult && toolResult.content && toolResult.content.length > 0) {
          const content = toolResult.content[0].text || ''
          const isAvailable = content.includes('✅') && !content.includes('❌')
          
          resolve({
            success: true,
            result: content,
            available: isAvailable
          })
        } else {
          resolve({
            success: false,
            result: 'No valid response from MCP bridge',
            available: false,
            error: 'Invalid MCP response'
          })
        }
      } catch (parseError) {
        resolve({
          success: false,
          result: 'Failed to parse MCP response',
          available: false,
          error: `Parse error: ${parseError}`
        })
      }
    })
    
    child.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        success: false,
        result: `Failed to start MCP bridge: ${error.message}`,
        available: false,
        error: error.message
      })
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const { server, tool, args } = await request.json()
    
    // Validate request format
    if (!server || !tool) {
      return NextResponse.json({
        error: 'Invalid request format - server and tool are required'
      }, { status: 400 })
    }
    
    console.log(`[CLI Status] Real-time checking for ${server}:${tool}`)
    
    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log(`[CLI Status] User not authenticated:`, userError)
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }
    
    // Map server names to CLI provider types and bridge paths
    const serverToCLI = {
      'claude-code-cli-bridge': 'claude_code',
      'cross-llm-bridge-test': 'codex_cli', 
      'gemini-cli-bridge': 'gemini_cli'
    }
    
    const bridgePaths = {
      'claude-code-cli-bridge': '../claude_code_cli_bridge.py',
      'cross-llm-bridge-test': '../codex_cli_bridge.py',
      'gemini-cli-bridge': '../gemini_cli_bridge.py'
    }
    
    const cliType = serverToCLI[server as keyof typeof serverToCLI]
    const bridgePath = bridgePaths[server as keyof typeof bridgePaths]
    
    if (!cliType || !bridgePath) {
      return NextResponse.json({
        error: `Unknown server: ${server}`
      }, { status: 400 })
    }
    
    // Get absolute path to bridge
    const absoluteBridgePath = path.resolve(process.cwd(), bridgePath)
    console.log(`[CLI Status] Bridge path: ${absoluteBridgePath}`)
    
    // Call MCP bridge for real-time validation
    const mcpResult = await callMCPBridge(absoluteBridgePath, tool)
    
    // Update database with real status
    if (mcpResult.success) {
      const newStatus = mcpResult.available ? 'available' : 'unavailable'
      const now = new Date().toISOString()
      
      // Update or create CLI configuration
      const { data: existingConfig } = await supabase
        .from('cli_provider_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', cliType)
        .single()
      
      if (existingConfig) {
        // Update existing
        await supabase
          .from('cli_provider_configurations')
          .update({
            status: newStatus,
            last_checked_at: now
          })
          .eq('id', existingConfig.id)
      } else {
        // Create new
        await supabase
          .from('cli_provider_configurations')
          .insert({
            user_id: user.id,
            provider: cliType,
            status: newStatus,
            enabled: true,
            last_checked_at: now
          })
      }
      
      console.log(`[CLI Status] Updated database: ${cliType} = ${newStatus}`)
    }
    
    return NextResponse.json({
      result: mcpResult.result,
      available: mcpResult.available,
      success: mcpResult.success,
      last_checked_at: new Date().toISOString(),
      mcp_validation: true // Flag to indicate this was real-time validation
    })
    
  } catch (error) {
    console.error(`[CLI Status] Error:`, error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }
    
    // Get all CLI configurations for the user
    const { data: cliConfigs, error: configError } = await supabase
      .from('cli_provider_configurations')
      .select('*')
      .eq('user_id', user.id)
    
    if (configError) {
      console.error(`[CLI Status] Database error:`, configError)
      return NextResponse.json({
        error: 'Failed to get CLI status'
      }, { status: 500 })
    }
    
    // Format response for all CLI types
    const cliStatus: {
      claude_code: any,
      codex_cli: any,
      gemini_cli: any
    } = {
      claude_code: null,
      codex_cli: null,
      gemini_cli: null
    }
    
    cliConfigs?.forEach(config => {
      const isAvailable = config.enabled && 
                         config.status === 'available' && 
                         config.last_checked_at && 
                         new Date(config.last_checked_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      cliStatus[config.provider as keyof typeof cliStatus] = {
        available: isAvailable,
        status: config.status,
        last_checked_at: config.last_checked_at,
        enabled: config.enabled,
        custom_path: config.custom_path
      }
    })
    
    return NextResponse.json(cliStatus)
    
  } catch (error) {
    console.error(`[CLI Status] Error:`, error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}