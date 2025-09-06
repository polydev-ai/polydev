'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Terminal, CheckCircle, XCircle, Clock, RefreshCw, Download, ExternalLink } from 'lucide-react'

interface CLIValidationResult {
  provider: string
  status: 'available' | 'unavailable' | 'not_installed' | 'checking'
  message: string
  cli_version?: string
  authenticated?: boolean
  error?: string
}

interface CLIProvider {
  id: string
  name: string
  checkCommand: string
  authCommand: string
  installCommand: string
  installUrl: string
  description: string
}

const CLI_PROVIDERS: CLIProvider[] = [
  {
    id: 'claude_code',
    name: 'Claude Code',
    checkCommand: 'claude --version',
    authCommand: 'claude auth login',
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    installUrl: 'https://claude.ai/docs/cli',
    description: 'Official Claude Code CLI for AI-powered development'
  },
  {
    id: 'codex_cli',
    name: 'Codex CLI',
    checkCommand: 'codex --version',
    authCommand: 'codex auth',
    installCommand: 'npm install -g @openai/codex-cli',
    installUrl: 'https://openai.com/codex',
    description: 'OpenAI Codex CLI for code generation'
  },
  {
    id: 'gemini_cli',
    name: 'Gemini CLI',
    checkCommand: 'gemini --version',
    authCommand: 'gemini auth login',
    installCommand: 'npm install -g @google/gemini-cli',
    installUrl: 'https://ai.google.dev/gemini-api/docs/cli',
    description: 'Google Gemini CLI for AI development'
  }
]

function CLIValidationContent() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const mcpToken = searchParams.get('mcpToken')
  
  const [results, setResults] = useState<CLIValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')

  useEffect(() => {
    if (userId && mcpToken) {
      startValidation()
    }
  }, [userId, mcpToken])

  const startValidation = async () => {
    if (!userId || !mcpToken) return

    setIsValidating(true)
    const validationResults: CLIValidationResult[] = []

    try {
      for (const provider of CLI_PROVIDERS) {
        setCurrentStep(`Checking ${provider.name}...`)
        
        // Update status to checking
        const checkingResult: CLIValidationResult = {
          provider: provider.id,
          status: 'checking',
          message: `Checking ${provider.name} installation...`
        }
        setResults(prev => [...prev.filter(r => r.provider !== provider.id), checkingResult])

        // Validate CLI
        const result = await validateCLI(provider)
        validationResults.push(result)
        
        // Update UI with result
        setResults(prev => [...prev.filter(r => r.provider !== provider.id), result])
        
        // Report to server
        await reportToServer(result, userId, mcpToken)
        
        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Send results back to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'CLI_VALIDATION_COMPLETE',
          results: validationResults
        }, window.location.origin)
      }

      setCurrentStep('Validation complete!')

    } catch (error: any) {
      console.error('CLI validation error:', error)
      
      if (window.opener) {
        window.opener.postMessage({
          type: 'CLI_VALIDATION_ERROR',
          error: error?.message || 'Validation failed'
        }, window.location.origin)
      }
      
      setCurrentStep(`Error: ${error?.message || 'Validation failed'}`)
    } finally {
      setIsValidating(false)
    }
  }

  const validateCLI = async (provider: CLIProvider): Promise<CLIValidationResult> => {
    try {
      // For browser environment, we need to use a different approach
      // We'll provide instructions and let users manually verify
      
      const result: CLIValidationResult = {
        provider: provider.id,
        status: 'not_installed',
        message: `Please manually verify ${provider.name} installation`,
      }

      // In a real desktop environment, this would execute commands
      // For now, we'll simulate validation and guide users
      
      return result

    } catch (error: any) {
      return {
        provider: provider.id,
        status: 'not_installed',
        message: `Error checking ${provider.name}: ${error?.message}`,
        error: error?.message
      }
    }
  }

  const reportToServer = async (result: CLIValidationResult, userId: string, mcpToken: string) => {
    try {
      const response = await fetch('/api/cli-status-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          user_id: userId,
          mcp_token: mcpToken
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log(`✅ Reported ${result.provider} status: ${result.status}`)

    } catch (error: any) {
      console.error(`❌ Failed to report ${result.provider}:`, error)
    }
  }

  const manualVerification = async (providerId: string, status: 'available' | 'unavailable' | 'not_installed') => {
    if (!userId || !mcpToken) return

    const provider = CLI_PROVIDERS.find(p => p.id === providerId)
    if (!provider) return

    const result: CLIValidationResult = {
      provider: providerId,
      status,
      message: status === 'available' 
        ? `${provider.name} manually verified as working`
        : status === 'unavailable'
        ? `${provider.name} installed but needs authentication`
        : `${provider.name} not installed`
    }

    setResults(prev => [...prev.filter(r => r.provider !== providerId), result])
    await reportToServer(result, userId, mcpToken)
  }

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'unavailable':
        return <XCircle className="w-5 h-5 text-yellow-500" />
      case 'not_installed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Terminal className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              CLI Validation
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Validating your CLI tools for Polydev integration
          </p>
          {currentStep && (
            <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg inline-block">
              {currentStep}
            </div>
          )}
        </div>

        {/* CLI Status Cards */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
          {CLI_PROVIDERS.map((provider) => {
            const result = results.find(r => r.provider === provider.id)
            const status = result?.status || 'pending'

            return (
              <div key={provider.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <StatusIcon status={status} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    status === 'unavailable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    status === 'not_installed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    status === 'checking' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {status === 'available' ? 'Ready' :
                     status === 'unavailable' ? 'Needs Auth' :
                     status === 'not_installed' ? 'Not Installed' :
                     status === 'checking' ? 'Checking...' : 'Pending'}
                  </span>
                </div>

                {result && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {result.message}
                    </p>
                    {result.cli_version && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Version: {result.cli_version}
                      </p>
                    )}
                  </div>
                )}

                {/* Manual Verification Section */}
                <div className="border-t dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Manual Verification
                  </h4>
                  
                  <div className="grid gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <div>
                      <span className="font-medium">Check: </span>
                      <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                        {provider.checkCommand}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">Auth: </span>
                      <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                        {provider.authCommand}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => manualVerification(provider.id, 'available')}
                      className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs rounded"
                    >
                      ✓ Working
                    </button>
                    <button
                      onClick={() => manualVerification(provider.id, 'unavailable')}
                      className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs rounded"
                    >
                      ⚠ Needs Auth
                    </button>
                    <button
                      onClick={() => manualVerification(provider.id, 'not_installed')}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded"
                    >
                      ✗ Not Installed
                    </button>
                    <a
                      href={provider.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Install</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 text-center">
          <button
            onClick={startValidation}
            disabled={isValidating}
            className={`px-6 py-3 rounded-lg font-medium ${
              isValidating
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isValidating ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating...</span>
              </div>
            ) : (
              'Re-run Validation'
            )}
          </button>

          <button
            onClick={() => window.close()}
            className="ml-4 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
          >
            Close
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            How to Use This Validation
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. <strong>Check Installation:</strong> Run the check command in your terminal</p>
            <p>2. <strong>Verify Status:</strong> Click the appropriate status button based on the result</p>
            <p>3. <strong>Install if Needed:</strong> Use the install links for missing tools</p>
            <p>4. <strong>Authenticate:</strong> Run auth commands for installed but unauthenticated tools</p>
            <p>5. <strong>Close:</strong> Your dashboard will automatically update with the new status</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CLIValidationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading CLI validation...</p>
        </div>
      </div>
    }>
      <CLIValidationContent />
    </Suspense>
  )
}