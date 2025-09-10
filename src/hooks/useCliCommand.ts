import { useState } from 'react'

interface CLICommandRequest {
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli'
  prompt: string
  model?: string // Optional - will use user's preference if not provided
}

interface CLICommandResult {
  success: boolean
  response?: string
  error?: string
  model_used?: string
}

export function useCliCommand() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeCommand = async (request: CLICommandRequest): Promise<CLICommandResult | null> => {
    setLoading(true)
    setError(null)

    try {
      // Get user ID and MCP token (these would come from your auth context)
      const userId = await getCurrentUserId() // You'll need to implement this
      const mcpToken = await getMCPToken() // You'll need to implement this

      const response = await fetch('/api/cli-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          mcp_token: mcpToken,
          provider: request.provider,
          model: request.model,
          prompt: request.prompt
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute CLI command')
      }

      const result: CLICommandResult = await response.json()
      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('CLI command error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    executeCommand,
    loading,
    error
  }
}

// Helper functions that need to be implemented based on your auth system
async function getCurrentUserId(): Promise<string> {
  // TODO: Implement this based on your Supabase auth
  // For now, return a placeholder - you'll need to integrate with useAuth or similar
  throw new Error('getCurrentUserId not implemented - integrate with your auth system')
}

async function getMCPToken(): Promise<string> {
  // TODO: Implement this based on your MCP token system
  // For now, return a placeholder - you'll need to get this from user preferences or storage
  throw new Error('getMCPToken not implemented - integrate with your MCP token system')
}