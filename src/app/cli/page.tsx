'use client'

import { useState } from 'react'
import { Terminal, Zap, Settings, Command, GitBranch, FileText, Users, Sparkles, ArrowRight, Code, Cpu, Network, Link, Download, Copy, Check, ExternalLink } from 'lucide-react'

export default function CLIIntegrationPage() {
  const [activeTab, setActiveTab] = useState('claude-desktop')
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCommand(id)
      setTimeout(() => setCopiedCommand(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const cliIntegrations = {
    'claude-desktop': {
      name: 'Claude Desktop',
      description: 'Anthropic\'s official desktop app with native MCP support and seamless Polydev integration',
      logo: '🤖',
      features: [
        'Native MCP protocol support',
        'Hosted server connectivity via SSE',
        'OAuth and API token authentication',
        'Real-time multi-model insights',
        'Seamless context management'
      ],
      setup: {
        install: 'Download Claude Desktop from claude.ai',
        config: `# Add to claude_desktop_config.json
{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "oauth",
          "provider": "polydev"
        }
      }
    }
  }
}`,
        usage: [
          'Use get_perspectives tool in chat',
          'Ask for multi-model insights on any topic',
          'Automatic breakthrough routing'
        ]
      },
      latestFeatures: [
        'Hosted MCP server integration',
        'OAuth authentication flow',
        'Real-time breakthrough insights',
        'Native MCP tool support'
      ]
    },
    'continue': {
      name: 'Continue.dev',
      description: 'Open-source AI code assistant with extensive MCP support for VS Code and JetBrains',
      logo: '💎',
      features: [
        'Deep codebase understanding',
        'Real-time code suggestions',
        'Multi-model routing capability',
        'Cross-IDE integration (VS Code, IntelliJ)',
        'Custom slash commands'
      ],
      setup: {
        install: 'Install Continue extension in VS Code/JetBrains',
        config: `# Add to .continue/config.json
{
  "experimental": {
    "modelContextProtocol": true
  },
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer",
          "token": "pd_your_token_here"
        }
      }
    }
  }
}`,
        usage: [
          'Use @polydev in chat for multi-model insights',
          'Get breakthrough insights on coding problems',
          'Route complex queries through multiple models'
        ]
      },
      latestFeatures: [
        'Hosted MCP server support',
        'Bearer token authentication',
        'Real-time model switching',
        'Enhanced context awareness'
      ]
    },
    'cursor': {
      name: 'Cursor',
      description: 'AI-first code editor with built-in chat and MCP integration for enhanced coding workflows',
      logo: '⚡',
      features: [
        'AI-first editing experience',
        'Built-in chat with MCP support',
        'Multi-file context understanding',
        'Real-time code suggestions',
        'Custom model routing'
      ],
      setup: {
        install: 'Download Cursor from cursor.com',
        config: `# Add to Cursor MCP settings
{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer", 
          "token": "pd_your_token_here"
        }
      }
    }
  }
}`,
        usage: [
          'Use get_perspectives tool in Cursor chat',
          'Route complex coding questions through multiple models',
          'Get breakthrough insights on architecture decisions'
        ]
      },
      latestFeatures: [
        'Native MCP server connectivity',
        'Bearer token authentication',
        'Multi-model breakthrough routing',
        'Enhanced AI chat interface'
      ]
    },
    'cline': {
      name: 'Cline (Claude in VSCode)',
      description: 'Popular VS Code extension bringing Claude directly into your editor with MCP support',
      logo: '📝',
      features: [
        'Seamless VS Code integration',
        'File system access and editing',
        'Terminal command execution',
        'MCP server connectivity',
        'Multi-model breakthrough insights'
      ],
      setup: {
        install: 'Install Cline extension in VS Code',
        config: `// Add to VS Code settings.json
{
  "cline.mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer",
          "token": "pd_your_token_here"
        }
      }
    }
  }
}`,
        usage: [
          'Use get_perspectives tool in Cline chat',
          'Route coding challenges through multiple models',
          'Get breakthrough insights on complex problems'
        ]
      },
      latestFeatures: [
        'Hosted MCP server integration',
        'Bearer token authentication',
        'Multi-model routing capability',
        'Real-time breakthrough insights'
      ]
    }
  }

  const currentIntegration = cliIntegrations[activeTab as keyof typeof cliIntegrations]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
                <Network className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Polydev MCP Integration
            </h1>
            <p className="text-xl text-blue-100 max-w-4xl mx-auto mb-8">
              Connect your favorite CLI tools to Polydev's hosted MCP server for breakthrough insights from multiple AI models. 
              Works with Claude Desktop, Cursor, Continue, Cline, and any MCP-compatible client through OAuth or API tokens.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a 
                href="/dashboard/mcp-tokens" 
                className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <Terminal className="w-5 h-5" />
                <span>Get Your MCP Token</span>
              </a>
              <a 
                href="/docs/mcp-integration" 
                className="px-8 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm flex items-center space-x-2"
              >
                <span>View Integration Guide</span>
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CLI Tool Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-2 py-4">
            {Object.entries(cliIntegrations).map(([key, integration]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{integration.logo}</span>
                <span>{integration.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4 mb-6">
                <div className="text-4xl">{currentIntegration.logo}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {currentIntegration.name} + Polydev
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    {currentIntegration.description}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Features with Polydev MCP</h3>
                <ul className="space-y-2">
                  {currentIntegration.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Setup Instructions</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">1. Install {currentIntegration.name}</h4>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg font-mono text-sm flex items-center justify-between">
                    <span className="text-gray-800 dark:text-gray-200">{currentIntegration.setup.install}</span>
                    <button
                      onClick={() => copyToClipboard(currentIntegration.setup.install, 'install')}
                      className="ml-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {copiedCommand === 'install' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">2. Configure Polydev MCP Server</h4>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Configuration</span>
                      <button
                        onClick={() => copyToClipboard(currentIntegration.setup.config, 'config')}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        {copiedCommand === 'config' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                    <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                      <code>{currentIntegration.setup.config}</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">3. Usage Examples</h4>
                  <div className="space-y-2">
                    {currentIntegration.setup.usage.map((command, index) => (
                      <div key={index} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                        <span className="text-gray-800 dark:text-gray-200">{command}</span>
                        <button
                          onClick={() => copyToClipboard(command, `usage-${index}`)}
                          className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          {copiedCommand === `usage-${index}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-500" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Latest Features */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span>Latest Features</span>
              </h3>
              <ul className="space-y-3">
                {currentIntegration.latestFeatures.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
              <div className="space-y-3">
                <a 
                  href="/dashboard/mcp-tokens"
                  className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Settings className="w-4 h-4" />
                  <span>Generate MCP Token</span>
                </a>
                <a 
                  href="/dashboard/api-keys"
                  className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Command className="w-4 h-4" />
                  <span>Configure API Keys</span>
                </a>
                <a 
                  href="/dashboard/preferences"
                  className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Zap className="w-4 h-4" />
                  <span>Set Model Preferences</span>
                </a>
                <a 
                  href="/docs/mcp-integration"
                  className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  <span>Full Documentation</span>
                </a>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">Why Use Polydev MCP?</h3>
              <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Access all your providers through one interface</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Intelligent model selection based on task</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Automatic failover and load balancing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Centralized usage tracking and billing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Enhanced context and conversation history</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Integration Demo Video Placeholder */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              See Polydev MCP in Action
            </h3>
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <Terminal className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-400" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Interactive demo coming soon
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Watch how Polydev MCP enhances {currentIntegration.name} with multi-model routing
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}