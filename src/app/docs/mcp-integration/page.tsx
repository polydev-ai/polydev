'use client'

import { useState } from 'react'
import { Copy, Check, Download, ExternalLink, Key, Settings, Zap } from 'lucide-react'

export default function MCPIntegrationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const configs = {
    claude: {
      title: 'Claude Desktop',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "polydev-ai",
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`,
      configPath: '~/Library/Application Support/Claude/claude_desktop_config.json'
    },
    cline: {
      title: 'Cline (VS Code)',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`,
      configPath: 'VS Code Settings → Extensions → Cline → MCP Settings'
    },
    cursor: {
      title: 'Cursor',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "polydev-ai",
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`,
      configPath: 'Cursor Settings → Extensions → MCP'
    },
    continue: {
      title: 'Continue VS Code',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "polydev-ai",
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`,
      configPath: '~/.continue/config.json'
    },
    openai: {
      title: 'OpenAI-Compatible Client',
      config: `import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://www.polydev.ai/api/chat/completions',
  apiKey: 'pd_your_token_here'
})

// Use any model from your configured providers
const completion = await client.chat.completions.create({
  model: 'gpt-4o', // or claude-3-5-sonnet-20241022, gemini-2.0-flash-exp, etc.
  messages: [
    { role: 'user', content: 'Hello from Polydev!' }
  ]
})`,
      configPath: 'JavaScript/TypeScript'
    },
    curl: {
      title: 'cURL',
      config: `curl -X POST https://www.polydev.ai/api/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pd_your_token_here" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user", 
        "content": "Hello from Polydev!"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 4000
  }'`,
      configPath: 'Command Line'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          MCP Integration Guide
        </h1>
        <p className="text-xl text-slate-600 mb-6">
          Connect your favorite MCP clients to Polydev for multi-model perspectives, CLI tool integration, and conversation memory access.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <Download className="w-8 h-8 text-slate-900 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                📦 Install Local MCP Package
              </h3>
              <p className="text-slate-600 mb-3">
                Install the Polydev MCP package locally via NPM. Runs as a local stdio server with access to CLI tools, memory, and your Polydev account.
              </p>
              <div className="bg-white p-3 rounded-lg mb-3 border border-slate-200">
                <code className="text-sm text-slate-900">npm install -g polydev-ai</code>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                  🏠 Local Execution
                </span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                  🔒 Secure Token Auth
                </span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                  🔗 Local CLI Access
                </span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-slate-100 text-slate-900 rounded-full border border-slate-200">
                  🧠 Memory Access
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-4">
            <Key className="w-8 h-8 text-slate-900 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Simple Token Authentication
              </h3>
              <p className="text-slate-600 mb-4">
                Generate your token and configure your environment. Local execution means access to CLI tools and recent conversations.
              </p>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">🔑 Setup Steps</h4>
                <ol className="text-sm text-slate-600 space-y-2">
                  <li><strong>1.</strong> Generate token in <a href="/dashboard/mcp-tokens" className="underline">dashboard</a></li>
                  <li><strong>2.</strong> Set environment variable: <code className="bg-white text-slate-900 px-2 py-1 rounded border border-slate-200">export POLYDEV_USER_TOKEN=pd_your_token</code></li>
                  <li><strong>3.</strong> Configure your API keys in <a href="/dashboard/models" className="underline">dashboard</a></li>
                  <li><strong>4.</strong> Add MCP server to your client config</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <Zap className="w-8 h-8 text-slate-900 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            CLI Tool Integration
          </h3>
          <p className="text-slate-600 text-sm">
            Detect and interact with local CLI tools (Claude Code, Cline, Cursor) directly from MCP clients.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <Settings className="w-8 h-8 text-slate-900 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Memory & Context
          </h3>
          <p className="text-slate-600 text-sm">
            Access recent conversations and extract memory from CLI tool sessions for contextual responses.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <Key className="w-8 h-8 text-slate-900 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Multi-Provider Access
          </h3>
          <p className="text-slate-600 text-sm">
            Access all your configured providers (OpenAI, Anthropic, Google, etc.) with secure token-based authentication.
          </p>
        </div>
      </div>

      {/* Configuration Examples */}
      <div className="space-y-8">
        {Object.entries(configs).map(([key, config]) => (
          <div key={key} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {config.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {config.configPath}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(config.config, key)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300 transition-colors"
                >
                  {copiedCode === key ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              <pre className="bg-white p-4 rounded-lg text-sm overflow-x-auto border border-slate-200">
                <code className="text-slate-900">
                  {config.config}
                </code>
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* API Reference */}
      <div className="mt-12 bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          Local MCP Server Reference
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              NPM Package
            </h3>
            <code className="bg-white text-slate-900 px-3 py-2 rounded text-sm border border-slate-200">
              npm install -g polydev-ai
            </code>
            <p className="text-slate-600 text-sm mt-2">
              Install the local MCP server package that runs on your machine via stdio.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Authentication
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-2">Environment Variable</h4>
              <p className="text-sm text-slate-600 mb-2">
                Set your Polydev token as an environment variable
              </p>
              <code className="text-xs bg-white text-slate-900 px-2 py-1 rounded block border border-slate-200">
                export POLYDEV_USER_TOKEN=pd_your_token_here
              </code>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Available Tools
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-slate-900">get_perspectives</h4>
                  <p className="text-sm text-slate-600">
                    Get multiple AI perspectives on a prompt using your configured providers
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">force_cli_detection</h4>
                  <p className="text-sm text-slate-600">
                    Force detection and status update for CLI tools (Claude Code, Cline, etc.)
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">send_cli_prompt</h4>
                  <p className="text-sm text-slate-600">
                    Send prompts directly to local CLI tools with fallback to perspectives
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">extract_memory</h4>
                  <p className="text-sm text-slate-600">
                    Extract and analyze memory from CLI tool conversations
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Supported Models
            </h3>
            <p className="text-slate-600 mb-3">
              Use any model from your configured providers:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-2">OpenAI</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li><code>gpt-4o</code></li>
                  <li><code>gpt-4-turbo</code></li>
                  <li><code>gpt-3.5-turbo</code></li>
                </ul>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-2">Anthropic</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li><code>claude-3-5-sonnet-20241022</code></li>
                  <li><code>claude-3-5-haiku-20241022</code></li>
                  <li><code>claude-3-opus-20240229</code></li>
                </ul>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <h4 className="font-medium text-slate-900 mb-2">Google</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li><code>gemini-2.0-flash-exp</code></li>
                  <li><code>gemini-1.5-pro</code></li>
                  <li><code>gemini-1.5-flash</code></li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Response Format
            </h3>
            <p className="text-slate-600 mb-2">
              Compatible with OpenAI API format. Supports streaming and non-streaming responses.
            </p>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="mt-12 bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Quick Setup Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-slate-900 mb-2">1</div>
            <h4 className="font-semibold text-slate-900 mb-2">Install Package</h4>
            <p className="text-sm text-slate-600">
              <code className="bg-white text-slate-900 px-2 py-1 rounded text-xs border border-slate-200">npm install -g polydev-ai</code>
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-slate-900 mb-2">2</div>
            <h4 className="font-semibold text-slate-900 mb-2">Get Token</h4>
            <p className="text-sm text-slate-600">
              Generate your MCP token in the dashboard
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-slate-900 mb-2">3</div>
            <h4 className="font-semibold text-slate-900 mb-2">Set Token</h4>
            <p className="text-sm text-slate-600">
              <code className="bg-white text-slate-900 px-2 py-1 rounded text-xs border border-slate-200">export POLYDEV_USER_TOKEN=...</code>
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-slate-900 mb-2">4</div>
            <h4 className="font-semibold text-slate-900 mb-2">Configure</h4>
            <p className="text-sm text-slate-600">
              Add to your MCP client config
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <a
            href="/dashboard/mcp-tokens"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300 transition-colors"
          >
            <Key className="w-4 h-4" />
            <span>Create MCP Token</span>
          </a>
          <a
            href="/dashboard/models"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configure API Keys</span>
          </a>
          <a
            href="/dashboard/preferences"
            className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>Set Preferences</span>
          </a>
        </div>
      </div>
    </div>
  )
}