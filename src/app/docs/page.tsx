'use client'

import { useState } from 'react'
import Link from 'next/link'

interface DocSection {
  id: string
  title: string
  items: {
    title: string
    href: string
    description?: string
  }[]
}

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started')

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      items: [
        { title: 'Introduction', href: '#introduction', description: 'What is Polydev AI?' },
        { title: 'Quick Start', href: '#quick-start', description: 'Get up and running in 5 minutes' },
        { title: 'Authentication', href: '#authentication', description: 'API keys and configuration' }
      ]
    },
    {
      id: 'mcp-integration',
      title: 'MCP Integration',
      items: [
        { title: 'Overview', href: '#mcp-overview', description: 'Model Context Protocol support' },
        { title: 'Claude Desktop', href: '#claude-desktop', description: 'Setup with Claude Desktop' },
        { title: 'Cursor & IDEs', href: '#cursor-setup', description: 'IDE integrations' }
      ]
    },
    {
      id: 'perspectives',
      title: 'Multi-AI Perspectives',
      items: [
        { title: 'Get Perspectives', href: '#get-perspectives', description: 'Query multiple AI models' },
        { title: 'Supported Models', href: '#supported-models', description: 'Available LLM providers' },
        { title: 'Memory System', href: '#memory-system', description: 'Context and conversation memory' }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      items: [
        { title: 'REST Endpoints', href: '#rest-api', description: 'HTTP API reference' },
        { title: 'Rate Limits', href: '#rate-limits', description: 'Usage limits and pricing' },
        { title: 'Error Handling', href: '#error-handling', description: 'Error codes and responses' }
      ]
    }
  ]

  const getDocContent = (section: string) => {
    switch (section) {
      case 'getting-started':
        return (
          <div className="space-y-8">
            {/* Introduction */}
            <section id="introduction">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Polydev AI Documentation
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Break through AI agent roadblocks with multiple expert perspectives. Query GPT-4, Claude 3.5, Gemini Pro, 
                and 30+ models in parallel to overcome decision paralysis and complex challenges.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  What is Polydev AI?
                </h3>
                <p className="text-blue-800 dark:text-blue-200">
                  Polydev AI is an MCP server that provides instant access to multiple AI models. When your agent gets stuck, 
                  use our <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-sm">get_perspectives</code> tool 
                  to get diverse expert viewpoints from leading LLMs simultaneously.
                </p>
              </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Quick Start</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Get API Keys</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Sign up and add your provider API keys for the best experience:
                  </p>
                  <Link 
                    href="/dashboard/api-keys"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Configure API Keys →
                  </Link>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. MCP Setup</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Add to your MCP client configuration:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm">
{`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["@polydev/mcp-server"],
      "env": {
        "POLYDEV_API_URL": "https://polydev.ai/api/mcp"
      }
    }
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Start Using</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Call the tool when your agent needs multiple perspectives:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-blue-400 text-sm">
{`get_perspectives({
  "prompt": "Help me debug this React performance issue",
  "models": ["gpt-4", "claude-3.5-sonnet", "gemini-pro"]
})`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Authentication</h2>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Recommended: User API Keys</h4>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    Sign in and configure your own API keys for full access to all providers and models.
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Alternative: MCP Tokens</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Generate MCP tokens for limited access with managed keys (legacy approach).
                  </p>
                </div>
              </div>
            </section>
          </div>
        )

      case 'mcp-integration':
        return (
          <div className="space-y-8">
            <section id="mcp-overview">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">MCP Integration</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Polydev AI supports the Model Context Protocol (MCP) for seamless integration with AI agents and IDEs.
              </p>
            </section>

            <section id="claude-desktop">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Claude Desktop Setup</h2>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Add Polydev to your Claude Desktop MCP configuration:
                </p>
                
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm">
{`// ~/.config/claude/mcp.json (macOS/Linux)
// %APPDATA%\\Claude\\mcp.json (Windows)

{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["@polydev/mcp-server"],
      "env": {
        "POLYDEV_API_URL": "https://polydev.ai/api/mcp"
      }
    }
  }
}`}
                  </pre>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    <strong>Note:</strong> Restart Claude Desktop after updating the configuration file.
                  </p>
                </div>
              </div>
            </section>

            <section id="cursor-setup">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Cursor & IDE Setup</h2>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  For Cursor, VS Code extensions, and other MCP-compatible tools:
                </p>
                
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm">
{`{
  "mcp": {
    "servers": {
      "polydev": {
        "command": "npx",
        "args": ["@polydev/mcp-server"],
        "env": {
          "POLYDEV_API_URL": "https://polydev.ai/api/mcp"
        }
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        )

      case 'perspectives':
        return (
          <div className="space-y-8">
            <section id="get-perspectives">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Multi-AI Perspectives</h1>
              
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                The core <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">get_perspectives</code> tool 
                queries multiple AI models simultaneously to provide diverse expert viewpoints.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Usage</h3>
              
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-6">
                <pre className="text-blue-400 text-sm">
{`get_perspectives({
  "prompt": "I'm debugging a React performance issue. The component re-renders excessively but I can't pinpoint why. Help me identify potential causes and solutions.",
  "models": ["gpt-4", "claude-3.5-sonnet", "gemini-pro", "llama-3.1-70b"]
})`}
                </pre>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Parameters</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Parameter</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">prompt</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">string</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Your question or problem description</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">models</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">string[]</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Array of model names to query (optional)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">temperature</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">number</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Response randomness (0.0-2.0, default: 0.7)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">max_tokens</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">number</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Maximum response length per model</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="supported-models">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Supported Models</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">OpenAI</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>gpt-4</li>
                    <li>gpt-3.5-turbo</li>
                    <li>gpt-4-turbo</li>
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Anthropic</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>claude-3.5-sonnet</li>
                    <li>claude-3-opus</li>
                    <li>claude-3-haiku</li>
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Google</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>gemini-pro</li>
                    <li>gemini-flash</li>
                    <li>gemini-ultra</li>
                  </ul>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                And 20+ more models from Groq, Perplexity, Together AI, and other providers.
              </p>
            </section>

            <section id="memory-system">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Memory System</h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Polydev AI automatically stores conversation history and project context to provide more relevant responses over time.
              </p>
              
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Conversation Memory</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically stores recent chat history to maintain context across requests. Configurable history length (1-50 conversations).
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Project Memory</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Dynamic snapshots of project context, patterns, and decisions. Updates automatically with each request to stay current.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Memory Dashboard</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View and manage stored memories through the web interface. Search, filter, and organize your conversation history.
                  </p>
                </div>
              </div>
              
              <Link 
                href="/dashboard/memory"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium mt-4"
              >
                View Memory Dashboard →
              </Link>
            </section>
          </div>
        )

      case 'api-reference':
        return (
          <div className="space-y-8">
            <section id="rest-api">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">API Reference</h1>
              
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">REST Endpoints</h2>
              
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">POST</span>
                    <code className="text-lg font-mono">/api/perspectives</code>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Get multiple AI perspectives on a prompt
                  </p>
                  
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Request Body</h4>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-sm">
{`{
  "prompt": "Your question or problem description",
  "models": ["gpt-4", "claude-3.5-sonnet"],
  "temperature": 0.7,
  "max_tokens": 1000,
  "project_memory": "light"
}`}
                    </pre>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 mt-4">Response</h4>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-blue-400 text-sm">
{`{
  "success": true,
  "perspectives": [
    {
      "model": "gpt-4",
      "response": "Model response...",
      "tokens": 234,
      "latency": 1100
    }
  ],
  "total_tokens": 456,
  "total_latency": 2300
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            <section id="rate-limits">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Rate Limits</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requests/Min</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requests/Hour</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Free</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">10</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">100</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Standard</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">100</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">2,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="error-handling">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Error Handling</h2>
              
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">401 Unauthorized</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm">Invalid or missing authentication credentials</p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">429 Rate Limited</h4>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">Request rate limit exceeded</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">500 Server Error</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Internal server error - please try again</p>
                </div>
              </div>
            </section>
          </div>
        )

      default:
        return <div>Documentation content for {section}</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 lg:flex-shrink-0">
            <div className="sticky top-8">
              <nav className="space-y-1">
                {docSections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {section.title}
                    </button>
                    {activeSection === section.id && (
                      <div className="ml-4 space-y-1">
                        {section.items.map((item) => (
                          <a
                            key={item.href}
                            href={item.href}
                            className="block px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                          >
                            {item.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              {getDocContent(activeSection)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}