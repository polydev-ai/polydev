'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, Terminal, Code2, Box, Sparkles, Cpu, ArrowRight, Key, AlertCircle, CheckCircle2 } from 'lucide-react'

type TabId = 'claude-code' | 'cursor' | 'cline' | 'windsurf' | 'continue' | 'api'

export default function Documentation() {
  const [activeTab, setActiveTab] = useState<TabId>('claude-code')
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

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-slate-900 text-white p-4 rounded-lg text-sm overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        {copiedCode === id ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-slate-300" />
        )}
      </button>
    </div>
  )

  const StepNumber = ({ num }: { num: number }) => (
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
      {num}
    </div>
  )

  const tabs = [
    { id: 'claude-code' as TabId, label: 'Claude Code', icon: Terminal, popular: true },
    { id: 'cursor' as TabId, label: 'Cursor', icon: Code2 },
    { id: 'cline' as TabId, label: 'Cline', icon: Box },
    { id: 'windsurf' as TabId, label: 'Windsurf', icon: Sparkles },
    { id: 'continue' as TabId, label: 'Continue', icon: Cpu },
    { id: 'api' as TabId, label: 'REST API', icon: Code2 },
  ]

  const configs: Record<TabId, { command: string; config: string; configPath: string }> = {
    'claude-code': {
      command: 'claude mcp add polydev --scope user -- npx --yes --package=polydev-ai@latest -- polydev-stdio',
      configPath: '~/.claude.json',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["--yes", "--package=polydev-ai@latest", "--", "polydev-stdio"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
    },
    'cursor': {
      command: '',
      configPath: '~/.cursor/mcp.json',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["--yes", "--package=polydev-ai@latest", "--", "polydev-stdio"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
    },
    'cline': {
      command: '',
      configPath: 'VS Code Settings or ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      config: `{
  "cline.mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["--yes", "--package=polydev-ai@latest", "--", "polydev-stdio"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
    },
    'windsurf': {
      command: '',
      configPath: '~/.codeium/windsurf/mcp_config.json',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["--yes", "--package=polydev-ai@latest", "--", "polydev-stdio"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
    },
    'continue': {
      command: '',
      configPath: '~/.continue/config.json',
      config: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["--yes", "--package=polydev-ai@latest", "--", "polydev-stdio"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
    },
    'api': {
      command: '',
      configPath: 'API Endpoint',
      config: `curl -X POST https://www.polydev.ai/api/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pd_your_token_here" \\
  -d '{
    "model": "gpt-5.1",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`
    }
  }

  const currentConfig = configs[activeTab]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Get Started with Polydev
          </h1>
          <p className="text-xl text-slate-600">
            Connect your IDE to get AI perspectives from multiple models when you're stuck.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Step 1: Get Token */}
        <section className="mb-16">
          <div className="flex items-start gap-4 mb-6">
            <StepNumber num={1} />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Get your token</h2>
              <p className="text-slate-600 mt-1">Generate a token from your dashboard</p>
            </div>
          </div>

          <div className="ml-11">
            <Link
              href="/dashboard/mcp-tokens"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              <Key className="w-4 h-4" />
              Generate Token
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-sm text-slate-500 mt-3">
              Your token starts with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">pd_</code>
            </p>
          </div>
        </section>

        {/* Step 2: Choose IDE */}
        <section className="mb-16">
          <div className="flex items-start gap-4 mb-6">
            <StepNumber num={2} />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Connect your IDE</h2>
              <p className="text-slate-600 mt-1">Add Polydev to your coding environment</p>
            </div>
          </div>

          <div className="ml-11">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.popular && activeTab === tab.id && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/20">Popular</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Claude Code specific - has CLI command */}
            {activeTab === 'claude-code' && (
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Run this command:</p>
                  <CodeBlock code={currentConfig.command} id="cc-command" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Then set your token:</p>
                  <CodeBlock
                    code={`export POLYDEV_USER_TOKEN="pd_your_token_here"`}
                    id="cc-token"
                  />
                </div>
              </div>
            )}

            {/* API tab */}
            {activeTab === 'api' && (
              <div className="space-y-4 mb-6">
                <p className="text-sm text-slate-600">
                  Polydev is OpenAI SDK compatible. Use it with cURL or any HTTP client:
                </p>
                <CodeBlock code={currentConfig.config} id="api-config" />
              </div>
            )}

            {/* Config file for other IDEs */}
            {activeTab !== 'claude-code' && activeTab !== 'api' && (
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Add to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 text-xs">{currentConfig.configPath}</code>:
                  </p>
                  <CodeBlock code={currentConfig.config} id={`${activeTab}-config`} />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600">
                    Replace <code className="bg-slate-100 px-1 rounded">pd_your_token_here</code> with your actual token, then restart your IDE.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Try it */}
        <section className="mb-16">
          <div className="flex items-start gap-4 mb-6">
            <StepNumber num={3} />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Try it out</h2>
              <p className="text-slate-600 mt-1">Ask your AI assistant to use Polydev</p>
            </div>
          </div>

          <div className="ml-11">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
              <p className="text-slate-700 font-medium mb-3">Example prompt:</p>
              <p className="text-slate-600 italic">
                "Can you get perspectives from multiple AI models about the best way to structure a React component?"
              </p>
            </div>

            <div className="mt-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-slate-600">
                Polydev will query multiple AI models (Claude, GPT, Gemini) and return diverse perspectives.
              </p>
            </div>
          </div>
        </section>

        {/* Available Tools */}
        <section className="mb-16 border-t border-slate-200 pt-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Available MCP Tools</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="font-medium text-slate-900">get_perspectives</p>
              <p className="text-sm text-slate-600 mt-1">Get AI perspectives from multiple models simultaneously</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="font-medium text-slate-900">send_cli_prompt</p>
              <p className="text-sm text-slate-600 mt-1">Send prompts to local CLI tools (Claude Code, Codex)</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="font-medium text-slate-900">force_cli_detection</p>
              <p className="text-sm text-slate-600 mt-1">Detect available local CLI tools</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="font-medium text-slate-900">extract_memory</p>
              <p className="text-sm text-slate-600 mt-1">Extract conversation memory for context sharing</p>
            </div>
          </div>
        </section>

        {/* Supported Models */}
        <section className="mb-16 border-t border-slate-200 pt-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Supported Models</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">OpenAI</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>gpt-5.1</li>
                <li>gpt-5.1-mini</li>
                <li>gpt-5.1-nano</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">Anthropic</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>claude-opus-4.5</li>
                <li>claude-sonnet-4.5</li>
                <li>claude-haiku-4.5</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">Google</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>gemini-3.0-pro</li>
                <li>gemini-3.0-flash</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">xAI</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>grok-4.1</li>
                <li>grok-4.1-mini</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="border-t border-slate-200 pt-12">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Next Steps</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/models"
              className="group border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors"
            >
              <h3 className="font-medium text-slate-900 mb-1">Add API Keys</h3>
              <p className="text-sm text-slate-600">Configure your own provider keys for more control</p>
              <span className="inline-flex items-center text-sm text-slate-500 mt-3 group-hover:text-slate-900">
                Settings <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </Link>
            <Link
              href="/chat"
              className="group border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors"
            >
              <h3 className="font-medium text-slate-900 mb-1">Try Chat</h3>
              <p className="text-sm text-slate-600">Test multi-model chat in your browser</p>
              <span className="inline-flex items-center text-sm text-slate-500 mt-3 group-hover:text-slate-900">
                Open Chat <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </Link>
            <Link
              href="/docs/mcp-integration"
              className="group border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors"
            >
              <h3 className="font-medium text-slate-900 mb-1">Full Setup Guide</h3>
              <p className="text-sm text-slate-600">Detailed instructions with troubleshooting</p>
              <span className="inline-flex items-center text-sm text-slate-500 mt-3 group-hover:text-slate-900">
                View Guide <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Need help? <a href="mailto:support@polydev.ai" className="text-slate-700 underline">support@polydev.ai</a>
          </p>
        </div>
      </div>
    </div>
  )
}
