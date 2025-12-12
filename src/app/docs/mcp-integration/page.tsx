'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Copy, Check, Download, ExternalLink, Key, Settings, Zap,
  ChevronDown, ChevronRight, Terminal, Code2, Box, Cpu,
  AlertCircle, CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react'

type TabId = 'claude-code' | 'cursor' | 'cline' | 'windsurf' | 'codex' | 'continue' | 'api'

export default function MCPIntegrationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('claude-code')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'prereq': true,
    'install': true,
    'config': true,
    'verify': true,
    'troubleshoot': false,
  })

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const CodeBlock = ({ code, id, language = 'bash' }: { code: string; id: string; language?: string }) => (
    <div className="relative group">
      <pre className="bg-slate-900 text-white p-4 rounded-lg text-sm overflow-x-auto">
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
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
      {num}
    </div>
  )

  const tabs = [
    { id: 'claude-code' as TabId, label: 'Claude Code', icon: Terminal, popular: true },
    { id: 'cursor' as TabId, label: 'Cursor', icon: Code2 },
    { id: 'cline' as TabId, label: 'Cline', icon: Box },
    { id: 'windsurf' as TabId, label: 'Windsurf', icon: Sparkles },
    { id: 'codex' as TabId, label: 'Codex CLI', icon: Terminal },
    { id: 'continue' as TabId, label: 'Continue', icon: Cpu },
    { id: 'api' as TabId, label: 'REST API', icon: Code2 },
  ]

  const ideConfigs = {
    'claude-code': {
      title: 'Claude Code CLI',
      description: 'Anthropic\'s official AI-powered command-line tool for coding',
      icon: Terminal,
      steps: [
        {
          title: 'Install Claude Code',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">If you haven't installed Claude Code yet, install it via npm:</p>
              <CodeBlock code="npm install -g @anthropic-ai/claude-code" id="cc-install" />
            </div>
          )
        },
        {
          title: 'Add Polydev MCP Server',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Use the built-in command to add Polydev as an MCP server:</p>
              <CodeBlock
                code={`claude mcp add polydev --scope user -- npx -y polydev-ai`}
                id="cc-add"
              />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Scope Options</p>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li><code className="bg-blue-100 px-1 rounded">--scope user</code> - Available in all your projects</li>
                      <li><code className="bg-blue-100 px-1 rounded">--scope project</code> - Only this project (creates .mcp.json)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'Set Your Token',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Set your Polydev token as an environment variable:</p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">macOS / Linux:</p>
                <CodeBlock
                  code={`# Add to your ~/.zshrc or ~/.bashrc
export POLYDEV_USER_TOKEN="pd_your_token_here"`}
                  id="cc-token-unix"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Windows (PowerShell):</p>
                <CodeBlock
                  code={`$env:POLYDEV_USER_TOKEN = "pd_your_token_here"`}
                  id="cc-token-win"
                />
              </div>
              <p className="text-sm text-slate-500">
                Don't have a token? <Link href="/dashboard/mcp-tokens" className="text-slate-900 underline font-medium">Generate one in your dashboard</Link>
              </p>
            </div>
          )
        },
        {
          title: 'Verify Installation',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Check that Polydev is properly configured:</p>
              <CodeBlock code="claude mcp list" id="cc-verify" />
              <p className="text-slate-600">You should see <code className="bg-slate-100 px-2 py-0.5 rounded">polydev</code> in the list of available servers.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">Test it out!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Start Claude Code and ask: "Can you get perspectives from multiple AI models about the best way to structure a React component?"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        },
      ],
      configFile: {
        path: '~/.claude.json or .mcp.json (project)',
        content: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
      },
      troubleshooting: [
        { issue: 'Server not appearing in list', solution: 'Run `claude mcp remove polydev` then re-add it. Make sure npx is in your PATH.' },
        { issue: 'Authentication errors', solution: 'Verify your token is correct and the env variable is set. Try `echo $POLYDEV_USER_TOKEN` to check.' },
        { issue: 'Timeout errors', solution: 'Ensure you have a stable internet connection. The first run may take longer as npx downloads the package.' },
      ]
    },
    'cursor': {
      title: 'Cursor IDE',
      description: 'AI-first code editor built for pair programming',
      icon: Code2,
      steps: [
        {
          title: 'Open Cursor Settings',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Open Cursor and navigate to MCP settings:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-600">
                <li>Press <code className="bg-slate-100 px-2 py-0.5 rounded">Cmd/Ctrl + ,</code> to open Settings</li>
                <li>Search for "MCP" in the settings search</li>
                <li>Click on "Edit in settings.json" or navigate to MCP configuration</li>
              </ol>
            </div>
          )
        },
        {
          title: 'Locate Config File',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">The MCP configuration file location varies by OS:</p>
              <div className="grid gap-3">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">macOS</p>
                  <code className="text-sm text-slate-600">~/.cursor/mcp.json</code>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">Windows</p>
                  <code className="text-sm text-slate-600">%USERPROFILE%\.cursor\mcp.json</code>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">Linux</p>
                  <code className="text-sm text-slate-600">~/.cursor/mcp.json</code>
                </div>
              </div>
              <p className="text-sm text-slate-500">You can also create a project-specific config at <code className="bg-slate-100 px-1 rounded">.cursor/mcp.json</code></p>
            </div>
          )
        },
        {
          title: 'Add Polydev Configuration',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Add the following to your MCP configuration:</p>
              <CodeBlock
                code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`}
                id="cursor-config"
                language="json"
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Replace <code className="bg-amber-100 px-1 rounded">pd_your_token_here</code> with your actual Polydev token from the dashboard.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'Restart Cursor',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Completely quit and restart Cursor to load the new MCP configuration.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Polydev tools should now be available in Cursor's Composer and Agent mode.
                  </p>
                </div>
              </div>
            </div>
          )
        },
      ],
      configFile: {
        path: '~/.cursor/mcp.json',
        content: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
      },
      troubleshooting: [
        { issue: 'Tools not appearing', solution: 'Check JSON syntax (no trailing commas). Restart Cursor after config changes.' },
        { issue: 'npx not found', solution: 'Ensure Node.js is installed and npx is in your PATH. Try specifying full path to npx.' },
        { issue: 'Permission denied', solution: 'Check file permissions on mcp.json. Make sure the file is readable.' },
      ]
    },
    'cline': {
      title: 'Cline (VS Code)',
      description: 'Autonomous AI coding assistant for VS Code',
      icon: Box,
      steps: [
        {
          title: 'Install Cline Extension',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Install Cline from the VS Code marketplace:</p>
              <CodeBlock code="code --install-extension saoudrizwan.claude-dev" id="cline-install" />
              <p className="text-sm text-slate-500">Or search for "Cline" in VS Code Extensions (Cmd/Ctrl + Shift + X)</p>
            </div>
          )
        },
        {
          title: 'Open MCP Settings',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Access Cline's MCP configuration:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-600">
                <li>Open VS Code Settings (<code className="bg-slate-100 px-2 py-0.5 rounded">Cmd/Ctrl + ,</code>)</li>
                <li>Search for "Cline MCP"</li>
                <li>Click "Edit in settings.json" for the MCP Servers setting</li>
              </ol>
            </div>
          )
        },
        {
          title: 'Add Polydev Configuration',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Add to your Cline MCP settings:</p>
              <CodeBlock
                code={`{
  "cline.mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`}
                id="cline-config"
                language="json"
              />
              <p className="text-sm text-slate-500">
                Alternatively, create a file at <code className="bg-slate-100 px-1 rounded">~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json</code>
              </p>
            </div>
          )
        },
        {
          title: 'Reload VS Code',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Reload VS Code window to apply changes:</p>
              <CodeBlock code="Cmd/Ctrl + Shift + P → Developer: Reload Window" id="cline-reload" />
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Polydev tools will now be available in Cline's tool palette!
                  </p>
                </div>
              </div>
            </div>
          )
        },
      ],
      configFile: {
        path: 'VS Code settings.json or cline_mcp_settings.json',
        content: `{
  "cline.mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
      },
      troubleshooting: [
        { issue: 'MCP server not connecting', solution: 'Check VS Code output panel (View → Output → Cline) for error messages.' },
        { issue: 'Tools not showing', solution: 'Ensure Cline extension is updated to latest version. Reload VS Code.' },
        { issue: 'Environment variable not read', solution: 'VS Code may need to be launched from terminal to inherit env vars, or set them in the config directly.' },
      ]
    },
    'windsurf': {
      title: 'Windsurf IDE',
      description: 'AI-native development environment by Codeium',
      icon: Sparkles,
      steps: [
        {
          title: 'Open Windsurf Settings',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Navigate to MCP configuration in Windsurf:</p>
              <ol className="list-decimal list-inside space-y-2 text-slate-600">
                <li>Press <code className="bg-slate-100 px-2 py-0.5 rounded">Cmd/Ctrl + ,</code> to open Settings</li>
                <li>Scroll to "Plugins (MCP servers)" under Cascade</li>
                <li>Click "Manage Plugins"</li>
                <li>Click "View raw config" to edit the JSON directly</li>
              </ol>
            </div>
          )
        },
        {
          title: 'Locate Config File',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">The config file is located at:</p>
              <div className="grid gap-3">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">macOS / Linux</p>
                  <code className="text-sm text-slate-600">~/.codeium/windsurf/mcp_config.json</code>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">Windows</p>
                  <code className="text-sm text-slate-600">%USERPROFILE%\.codeium\windsurf\mcp_config.json</code>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'Add Polydev Configuration',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Add Polydev to your MCP config:</p>
              <CodeBlock
                code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`}
                id="windsurf-config"
                language="json"
              />
            </div>
          )
        },
        {
          title: 'Restart Windsurf',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Completely quit and restart Windsurf to load the new configuration.</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Polydev tools should now be available in Cascade!
                  </p>
                </div>
              </div>
            </div>
          )
        },
      ],
      configFile: {
        path: '~/.codeium/windsurf/mcp_config.json',
        content: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
      },
      troubleshooting: [
        { issue: 'Hammer icon missing', solution: 'Check JSON syntax for errors. Verify the mcp_config.json file exists.' },
        { issue: 'Server failed to start', solution: 'Ensure npx is in your system PATH. Check Windsurf logs for details.' },
        { issue: 'Tools not available', solution: 'Restart Windsurf completely (not just reload). Check the MCP connection status.' },
      ]
    },
    'codex': {
      title: 'OpenAI Codex CLI',
      description: 'OpenAI\'s command-line coding assistant',
      icon: Terminal,
      steps: [
        {
          title: 'Install Codex CLI',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">If not already installed:</p>
              <CodeBlock code="npm install -g @openai/codex" id="codex-install" />
            </div>
          )
        },
        {
          title: 'Locate Config File',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Codex CLI uses a TOML configuration file:</p>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-slate-700">All platforms</p>
                <code className="text-sm text-slate-600">~/.codex/config.toml</code>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    The same config file is shared between Codex CLI and VS Code extension.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'Add Polydev Configuration',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Add the following TOML configuration:</p>
              <CodeBlock
                code={`[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai"]

[mcp_servers.polydev.env]
POLYDEV_USER_TOKEN = "pd_your_token_here"`}
                id="codex-config"
                language="toml"
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    TOML syntax is different from JSON! Use <code className="bg-amber-100 px-1 rounded">=</code> instead of <code className="bg-amber-100 px-1 rounded">:</code>, and section headers in <code className="bg-amber-100 px-1 rounded">[brackets]</code>.
                  </p>
                </div>
              </div>
            </div>
          )
        },
        {
          title: 'Verify Setup',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Start Codex CLI and check available servers:</p>
              <CodeBlock code="codex" id="codex-start" />
              <p className="text-slate-600">Polydev tools should now be accessible in your Codex sessions.</p>
            </div>
          )
        },
      ],
      configFile: {
        path: '~/.codex/config.toml',
        content: `[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai"]

[mcp_servers.polydev.env]
POLYDEV_USER_TOKEN = "pd_your_token_here"`
      },
      troubleshooting: [
        { issue: 'TOML parse error', solution: 'Check for syntax errors - TOML is stricter than JSON. Use a TOML validator.' },
        { issue: 'Server not loading', solution: 'Ensure the config file is in the correct location (~/.codex/config.toml).' },
        { issue: 'VS Code extension also broken', solution: 'They share the same config - fix the TOML syntax and both will work.' },
      ]
    },
    'continue': {
      title: 'Continue (VS Code)',
      description: 'Open-source AI code assistant',
      icon: Cpu,
      steps: [
        {
          title: 'Install Continue Extension',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Install from VS Code marketplace:</p>
              <CodeBlock code="code --install-extension Continue.continue" id="continue-install" />
            </div>
          )
        },
        {
          title: 'Open Continue Config',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">The config file is located at:</p>
              <div className="bg-slate-50 p-3 rounded-lg">
                <code className="text-sm text-slate-600">~/.continue/config.json</code>
              </div>
            </div>
          )
        },
        {
          title: 'Add MCP Configuration',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Add the MCP servers section:</p>
              <CodeBlock
                code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`}
                id="continue-config"
                language="json"
              />
            </div>
          )
        },
        {
          title: 'Reload VS Code',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">Reload to apply changes:</p>
              <CodeBlock code="Cmd/Ctrl + Shift + P → Developer: Reload Window" id="continue-reload" />
            </div>
          )
        },
      ],
      configFile: {
        path: '~/.continue/config.json',
        content: `{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`
      },
      troubleshooting: [
        { issue: 'Config not loading', solution: 'Make sure config.json is valid JSON. Check for trailing commas.' },
        { issue: 'MCP section ignored', solution: 'Ensure you\'re using a recent version of Continue that supports MCP.' },
      ]
    },
    'api': {
      title: 'REST API',
      description: 'Direct API access for custom integrations',
      icon: Code2,
      steps: [
        {
          title: 'Get Your API Token',
          content: (
            <div className="space-y-3">
              <p className="text-slate-600">
                Generate an API token from your <Link href="/dashboard/mcp-tokens" className="text-slate-900 underline font-medium">dashboard</Link>.
              </p>
            </div>
          )
        },
        {
          title: 'Make API Requests',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Use cURL or any HTTP client:</p>
              <CodeBlock
                code={`curl -X POST https://www.polydev.ai/api/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pd_your_token_here" \\
  -d '{
    "model": "gpt-5.1",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
                id="api-curl"
              />
            </div>
          )
        },
        {
          title: 'OpenAI SDK Compatible',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Use with the OpenAI SDK:</p>
              <CodeBlock
                code={`import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://www.polydev.ai/api/chat/completions',
  apiKey: 'pd_your_token_here'
})

const response = await client.chat.completions.create({
  model: 'gpt-5.1', // or any supported model
  messages: [{ role: 'user', content: 'Hello!' }]
})`}
                id="api-sdk"
                language="typescript"
              />
            </div>
          )
        },
        {
          title: 'Get Multiple Perspectives',
          content: (
            <div className="space-y-4">
              <p className="text-slate-600">Use the perspectives endpoint to get responses from multiple models:</p>
              <CodeBlock
                code={`curl -X POST https://www.polydev.ai/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer pd_your_token_here" \\
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_perspectives",
      "arguments": {
        "prompt": "What's the best approach for state management in React?"
      }
    }
  }'`}
                id="api-perspectives"
              />
            </div>
          )
        },
      ],
      configFile: {
        path: 'API Endpoint',
        content: `Base URL: https://www.polydev.ai/api
Chat Completions: POST /chat/completions
MCP Tools: POST /mcp
Authorization: Bearer pd_your_token_here`
      },
      troubleshooting: [
        { issue: '401 Unauthorized', solution: 'Check that your token is correct and starts with "pd_".' },
        { issue: '429 Rate Limited', solution: 'You\'ve exceeded your usage limits. Check your dashboard for current usage.' },
        { issue: 'Model not found', solution: 'Ensure the model is available in your configured providers.' },
      ]
    },
  }

  const currentConfig = ideConfigs[activeTab]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link href="/docs" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4">
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
            Back to Docs
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            IDE Setup Guide
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Connect Polydev to your favorite coding IDE or editor. Get multi-model AI perspectives,
            CLI tool integration, and conversation memory - all through the Model Context Protocol (MCP).
          </p>
        </div>
      </div>

      {/* Quick Start Banner */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Quick Install</p>
                <p className="text-slate-300 text-sm">Install the MCP package globally</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-mono">
                npm install -g polydev-ai
              </code>
              <button
                onClick={() => copyToClipboard('npm install -g polydev-ai', 'quick-install')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copiedCode === 'quick-install' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.popular && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                    }`}>
                      Popular
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* IDE Header */}
            <div className="flex items-start gap-4 mb-8">
              {(() => {
                const Icon = currentConfig.icon
                return (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-slate-700" />
                  </div>
                )
              })()}
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{currentConfig.title}</h2>
                <p className="text-slate-600">{currentConfig.description}</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-6">
              {currentConfig.steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <StepNumber num={index + 1} />
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">{step.title}</h3>
                    {step.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Troubleshooting */}
            {currentConfig.troubleshooting && (
              <div className="mt-12">
                <button
                  onClick={() => toggleSection('troubleshoot')}
                  className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4"
                >
                  {expandedSections['troubleshoot'] ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                  Troubleshooting
                </button>
                {expandedSections['troubleshoot'] && (
                  <div className="space-y-3">
                    {currentConfig.troubleshooting.map((item, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="font-medium text-slate-900 mb-1">{item.issue}</p>
                        <p className="text-sm text-slate-600">{item.solution}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Config File */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Config File Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Configuration File</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{currentConfig.configFile.path}</p>
                </div>
                <div className="p-4">
                  <CodeBlock
                    code={currentConfig.configFile.content}
                    id={`${activeTab}-full-config`}
                  />
                </div>
              </div>

              {/* Get Token CTA */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                <Key className="w-8 h-8 mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">Need a Token?</h3>
                <p className="text-slate-300 text-sm mb-4">
                  Generate your Polydev user token to authenticate with the MCP server.
                </p>
                <Link
                  href="/dashboard/mcp-tokens"
                  className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                >
                  Get Token
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Available Tools */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Available Tools</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">get_perspectives</p>
                    <p className="text-xs text-slate-600">Get AI perspectives from multiple models</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">force_cli_detection</p>
                    <p className="text-xs text-slate-600">Detect local CLI tools status</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">send_cli_prompt</p>
                    <p className="text-xs text-slate-600">Send prompts to local CLI tools</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">extract_memory</p>
                    <p className="text-xs text-slate-600">Extract memory from conversations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Models Section */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Supported AI Models</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-3">OpenAI</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><code className="text-xs bg-white px-1 rounded">gpt-5.1</code></li>
                <li><code className="text-xs bg-white px-1 rounded">gpt-5.1-mini</code></li>
                <li><code className="text-xs bg-white px-1 rounded">gpt-5.1-nano</code></li>
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Anthropic</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><code className="text-xs bg-white px-1 rounded">claude-opus-4.5</code></li>
                <li><code className="text-xs bg-white px-1 rounded">claude-sonnet-4.5</code></li>
                <li><code className="text-xs bg-white px-1 rounded">claude-haiku-4.5</code></li>
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Google</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><code className="text-xs bg-white px-1 rounded">gemini-3.0-pro</code></li>
                <li><code className="text-xs bg-white px-1 rounded">gemini-3.0-flash</code></li>
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-3">xAI</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li><code className="text-xs bg-white px-1 rounded">grok-4.1</code></li>
                <li><code className="text-xs bg-white px-1 rounded">grok-4.1-mini</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Next Steps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/models"
              className="group bg-slate-50 border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <Settings className="w-8 h-8 text-slate-700 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-slate-700">Configure API Keys</h3>
              <p className="text-sm text-slate-600">
                Add your OpenAI, Anthropic, Google, and other provider API keys.
              </p>
              <span className="inline-flex items-center text-sm text-slate-900 mt-4 font-medium">
                Go to Settings <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </Link>
            <Link
              href="/dashboard/preferences"
              className="group bg-slate-50 border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <Zap className="w-8 h-8 text-slate-700 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-slate-700">Set Preferences</h3>
              <p className="text-sm text-slate-600">
                Configure which models to use for perspectives and your default settings.
              </p>
              <span className="inline-flex items-center text-sm text-slate-900 mt-4 font-medium">
                Set Preferences <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </Link>
            <Link
              href="/docs"
              className="group bg-slate-50 border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <ExternalLink className="w-8 h-8 text-slate-700 mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-slate-700">Read Full Docs</h3>
              <p className="text-sm text-slate-600">
                Learn about all features including API reference and advanced configuration.
              </p>
              <span className="inline-flex items-center text-sm text-slate-900 mt-4 font-medium">
                View Documentation <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
