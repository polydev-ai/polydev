'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Copy, Check, ArrowRight, Terminal, Puzzle, Settings, Zap, Command, Key, HelpCircle } from 'lucide-react'

export default function InstallationGuidePage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const CodeBlock = ({ code, index, language = 'bash' }: { code: string; index: number; language?: string }) => (
    <div className="relative group">
      <pre className="bg-[#0d1117] rounded-lg p-4 overflow-x-auto text-sm border border-[#30363d]">
        <code className="text-[#e6edf3] font-mono text-[13px]">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, index)}
        className="absolute top-2 right-2 p-2 bg-[#21262d] hover:bg-[#30363d] rounded text-[#7d8590] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              Installation
            </span>
            <span className="text-sm text-slate-400">January 2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-6">
            Complete Installation Guide
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Every way to install Polydev—from one-click plugin install to manual MCP configuration.
            Plus all available skills and commands.
          </p>
        </motion.header>

        {/* Table of Contents */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 p-6 bg-slate-50 rounded-xl border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">In this guide</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <a href="#installation-methods" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Installation Methods
            </a>
            <a href="#skills-commands" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <Command className="w-4 h-4" />
              Skills & Commands
            </a>
            <a href="#ide-guides" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <Puzzle className="w-4 h-4" />
              IDE-Specific Guides
            </a>
            <a href="#troubleshooting" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Troubleshooting
            </a>
          </div>
        </motion.section>

        {/* Prerequisites */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Prerequisites</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Node.js 18+</p>
                <p className="text-sm text-slate-600">Required for npx commands. <a href="https://nodejs.org" className="text-blue-600 hover:underline">Download here</a></p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Key className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Polydev API Token</p>
                <p className="text-sm text-slate-600">Get your free token from <a href="https://polydev.ai/dashboard/mcp-tokens" className="text-blue-600 hover:underline">polydev.ai/dashboard</a></p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Installation Methods */}
        <motion.section
          id="installation-methods"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Installation Methods</h2>

          {/* Method 1: Plugin Marketplace */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Puzzle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Method 1: Plugin Marketplace</h3>
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Recommended</span>
              </div>
            </div>

            <p className="text-slate-600 mb-4">
              The easiest way—installs MCP server, skills, and auto-invocation rules all at once.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">1. Add the marketplace:</p>
                <CodeBlock
                  code="/plugin marketplace add backspacevenkat/polydev-claude-code-plugin"
                  index={0}
                />
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">2. Install the plugin:</p>
                <CodeBlock
                  code="/plugin install polydev"
                  index={1}
                />
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">3. Set your token:</p>
                <CodeBlock
                  code='export POLYDEV_USER_TOKEN="pd_your_token_here"'
                  index={2}
                />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  4. Restart Claude Code and verify with <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/mcp</code>
                </p>
              </div>
            </div>
          </div>

          {/* Method 2: npx polydev-ai */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Terminal className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Method 2: npx polydev-ai</h3>
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Quick Start</span>
              </div>
            </div>

            <p className="text-slate-600 mb-4">
              Run directly with npx—no installation required. Perfect for trying it out.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">Run the MCP server:</p>
                <CodeBlock
                  code="POLYDEV_USER_TOKEN=pd_xxx npx polydev-ai"
                  index={3}
                />
              </div>

              <p className="text-sm text-slate-500">
                Or add to your shell profile for persistent access:
              </p>
              <CodeBlock
                code={`# Add to ~/.bashrc or ~/.zshrc
export POLYDEV_USER_TOKEN="pd_your_token_here"

# Then run anytime with:
npx polydev-ai`}
                index={4}
              />
            </div>
          </div>

          {/* Method 3: Manual MCP Config */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Method 3: Manual MCP Configuration</h3>
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Advanced</span>
              </div>
            </div>

            <p className="text-slate-600 mb-4">
              For full control, add the MCP server manually to your IDE&apos;s configuration.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">Add to your MCP settings (e.g., <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">~/.claude/settings.json</code>):</p>
                <CodeBlock
                  code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`}
                  index={5}
                  language="json"
                />
              </div>
            </div>
          </div>

          {/* Method 4: Global npm install */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Method 4: Global npm Install</h3>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">Permanent</span>
              </div>
            </div>

            <p className="text-slate-600 mb-4">
              Install globally for faster startup (no npx download on each run).
            </p>

            <CodeBlock
              code={`npm install -g polydev-ai

# Then configure MCP to use the global command:
{
  "mcpServers": {
    "polydev": {
      "command": "polydev-ai",
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}`}
              index={6}
            />
          </div>
        </motion.section>

        {/* Skills & Commands */}
        <motion.section
          id="skills-commands"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Skills & Commands</h2>

          <p className="text-slate-600 mb-6">
            Polydev provides these slash commands when installed via the plugin:
          </p>

          <div className="space-y-6">
            {/* /polydev */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-semibold text-slate-900">/polydev [question]</code>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Primary</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-slate-600 mb-4">
                  Query multiple AI models simultaneously to get diverse perspectives on any coding problem.
                </p>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Examples:</p>
                  <CodeBlock
                    code={`/polydev How should I structure my React state management?
/polydev Debug this TypeScript error: Property 'map' does not exist
/polydev Compare REST vs GraphQL for my mobile app backend
/polydev What's the best caching strategy for API responses?`}
                    index={7}
                  />
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-800">
                    <strong>Tip:</strong> Be specific! Include error messages, code snippets, and constraints for best results.
                  </p>
                </div>
              </div>
            </div>

            {/* /polydev-login */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-semibold text-slate-900">/polydev-login</code>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Authentication</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-slate-600 mb-4">
                  Authenticate with Polydev via browser-based OAuth. Opens your browser automatically.
                </p>
                <CodeBlock code="/polydev-login" index={8} />
                <div className="mt-4 text-sm text-slate-500">
                  <p><strong>What happens:</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Browser opens to Polydev authentication</li>
                    <li>Sign in with Google or GitHub</li>
                    <li>Token is automatically configured</li>
                    <li>Start using <code className="font-mono bg-slate-100 px-1 rounded">/polydev</code> immediately</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* /polydev-auth */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-semibold text-slate-900">/polydev-auth</code>
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Status</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-slate-600 mb-4">
                  Check your current authentication status and account information.
                </p>
                <CodeBlock code="/polydev-auth" index={9} />
                <div className="mt-4 text-sm text-slate-500">
                  <p><strong>Shows:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Account email and subscription tier</li>
                    <li>Credits remaining</li>
                    <li>Enabled models</li>
                    <li>Setup instructions (if not authenticated)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* /perspectives */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-semibold text-slate-900">/perspectives</code>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">Alias</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-slate-600">
                  Alias for <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">/polydev</code>. Use whichever you prefer.
                </p>
              </div>
            </div>

            {/* /polydev-help */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-semibold text-slate-900">/polydev-help</code>
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">Help</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-slate-600">
                  Show usage guide and available commands directly in your IDE.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* MCP Tools */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">MCP Tools Available</h2>

          <p className="text-slate-600 mb-6">
            The Polydev MCP server provides these tools for programmatic access:
          </p>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            <div className="p-4">
              <code className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">polydev_perspectives</code>
              <p className="text-sm text-slate-600 mt-2">Query multiple AI models simultaneously. Returns perspectives from GPT-5, Gemini, Grok, and GLM.</p>
            </div>
            <div className="p-4">
              <code className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">polydev_list_models</code>
              <p className="text-sm text-slate-600 mt-2">List all available AI models and their status.</p>
            </div>
            <div className="p-4">
              <code className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">polydev_login</code>
              <p className="text-sm text-slate-600 mt-2">Initiate browser-based OAuth authentication flow.</p>
            </div>
            <div className="p-4">
              <code className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">polydev_auth</code>
              <p className="text-sm text-slate-600 mt-2">Check authentication status, credits, and account info.</p>
            </div>
          </div>
        </motion.section>

        {/* IDE-Specific Guides */}
        <motion.section
          id="ide-guides"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">IDE-Specific Guides</h2>

          {/* Claude Code */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">C</span>
              Claude Code
            </h3>
            <CodeBlock
              code={`# Plugin install (recommended)
/plugin marketplace add backspacevenkat/polydev-claude-code-plugin
/plugin install polydev

# Or manual config in ~/.claude/settings.json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxx" }
    }
  }
}`}
              index={10}
            />
          </div>

          {/* Cursor */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-black rounded text-white text-xs flex items-center justify-center font-bold">▶</span>
              Cursor
            </h3>
            <CodeBlock
              code={`# Add to ~/.cursor/mcp.json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxx" }
    }
  }
}`}
              index={11}
              language="json"
            />
          </div>

          {/* Windsurf */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-cyan-500 rounded text-white text-xs flex items-center justify-center font-bold">W</span>
              Windsurf (Codeium)
            </h3>
            <CodeBlock
              code={`# Add to ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxx" }
    }
  }
}`}
              index={12}
              language="json"
            />
          </div>

          {/* VS Code + Cline */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">VS</span>
              VS Code + Cline
            </h3>
            <CodeBlock
              code={`# Add to ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxx" }
    }
  }
}`}
              index={13}
              language="json"
            />
          </div>

          {/* Claude Desktop */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 rounded text-white text-xs flex items-center justify-center font-bold">🖥</span>
              Claude Desktop
            </h3>
            <CodeBlock
              code={`# Add to ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
# Or %APPDATA%\\Claude\\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxx" }
    }
  }
}`}
              index={14}
              language="json"
            />
          </div>
        </motion.section>

        {/* Auto-Invocation */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Auto-Invocation (Claude Code Plugin Only)</h2>

          <p className="text-slate-600 mb-4">
            When installed via the plugin, Polydev includes CLAUDE.md rules that trigger automatic multi-model consultation.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="font-medium text-green-800 mb-2">Auto-invokes when you:</p>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Say &quot;stuck&quot;, &quot;confused&quot;, &quot;not sure&quot;</li>
                <li>• Ask &quot;Should I use X or Y?&quot;</li>
                <li>• Request security/code review</li>
                <li>• Fail debugging 2-3 times</li>
                <li>• Ask architecture questions</li>
              </ul>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="font-medium text-red-800 mb-2">Does NOT auto-invoke for:</p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Simple syntax fixes</li>
                <li>• Documentation lookups</li>
                <li>• Boilerplate generation</li>
                <li>• When you want only Claude</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Customize by editing <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">~/.claude/CLAUDE.md</code>
          </p>
        </motion.section>

        {/* Models */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Models Consulted</h2>

          <p className="text-slate-600 mb-6">
            Every query consults 4 models in parallel (takes 10-30 seconds):
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900">GPT-5 Mini</p>
              <p className="text-sm text-slate-500">OpenAI&apos;s efficient model</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900">Gemini 3 Flash</p>
              <p className="text-sm text-slate-500">Google&apos;s fast reasoning model</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900">Grok 4.1 Fast</p>
              <p className="text-sm text-slate-500">xAI&apos;s quick inference model</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-semibold text-slate-900">GLM-4.7</p>
              <p className="text-sm text-slate-500">Zhipu AI&apos;s flagship model</p>
            </div>
          </div>
        </motion.section>

        {/* Troubleshooting */}
        <motion.section
          id="troubleshooting"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Troubleshooting</h2>

          <div className="space-y-4">
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-medium text-slate-900 mb-2">MCP server not showing up?</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Run <code className="font-mono bg-slate-100 px-1 rounded">/mcp</code> to check status</li>
                <li>• Verify POLYDEV_USER_TOKEN is set</li>
                <li>• Restart your IDE completely</li>
                <li>• Check Node.js is installed: <code className="font-mono bg-slate-100 px-1 rounded">node --version</code></li>
              </ul>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-medium text-slate-900 mb-2">Authentication failed?</p>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Get a new token from <a href="https://polydev.ai/dashboard/mcp-tokens" className="text-blue-600 hover:underline">polydev.ai/dashboard</a></li>
                <li>• Tokens start with <code className="font-mono bg-slate-100 px-1 rounded">pd_</code></li>
                <li>• Try <code className="font-mono bg-slate-100 px-1 rounded">/polydev-login</code> for browser auth</li>
              </ul>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-medium text-slate-900 mb-2">Slow responses?</p>
              <p className="text-sm text-slate-600">
                Multi-model queries take 10-30 seconds since they call 4 APIs in parallel. This is normal.
              </p>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="font-medium text-slate-900 mb-2">Plugin not found?</p>
              <p className="text-sm text-slate-600">
                Add the marketplace first: <code className="font-mono bg-slate-100 px-1 rounded">/plugin marketplace add backspacevenkat/polydev-claude-code-plugin</code>
              </p>
            </div>
          </div>
        </motion.section>

        {/* Pricing */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Pricing</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-6 border border-slate-200 rounded-xl">
              <p className="text-lg font-semibold text-slate-900 mb-1">Free</p>
              <p className="text-3xl font-bold text-slate-900 mb-4">$0<span className="text-sm font-normal text-slate-500">/month</span></p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• 500 credits/month</li>
                <li>• All 4 models</li>
                <li>• No credit card required</li>
              </ul>
            </div>
            <div className="p-6 border-2 border-blue-500 rounded-xl bg-blue-50">
              <p className="text-lg font-semibold text-blue-900 mb-1">Premium</p>
              <p className="text-3xl font-bold text-blue-900 mb-4">$10<span className="text-sm font-normal text-blue-600">/month</span></p>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• 10,000 credits/month</li>
                <li>• All 4 models</li>
                <li>• Priority support</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-4 text-center">
            1 credit = 1 request (queries all 4 models)
          </p>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-slate-200"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Ready to get started?</p>
              <p className="text-sm text-slate-500">Free tier: 500 credits/month</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Get API Token
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/backspacevenkat/polydev-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.section>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-3xl mx-auto px-6 text-center text-sm text-slate-400">
          <Link href="/articles" className="hover:text-slate-600 transition-colors">Articles</Link>
          {' · '}
          <Link href="/" className="hover:text-slate-600 transition-colors">Polydev</Link>
        </div>
      </footer>
    </div>
  )
}
