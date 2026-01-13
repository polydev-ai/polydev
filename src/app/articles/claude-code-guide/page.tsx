'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Terminal, Copy, Check, ArrowRight, Zap, MessageSquare, Settings, FolderOpen, Puzzle, Code, Server, Brain, Layers } from 'lucide-react'

export default function ClaudeCodeGuidePage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const CodeBlock = ({ code, index, language = 'bash' }: { code: string; index: number; language?: string }) => (
    <div className="relative group">
      <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-slate-300 font-mono">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, index)}
        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 pointer-events-none" />

      <article className="relative max-w-3xl mx-auto px-6 py-16">
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
            <span className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
              Integration Guide
            </span>
            <span className="text-sm text-slate-400">January 2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-6">
            Using Polydev with Claude Code
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Learn how to supercharge Claude Code with multi-model perspectives. Get unstuck faster
            and write better code by consulting GPT, Gemini, and Grok alongside Claude.
          </p>

          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-slate-200">
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Claude Code</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">MCP</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Plugin</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Skills</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Multi-Model AI</span>
          </div>
        </motion.header>

        {/* Understanding Plugin vs Skills vs MCP */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Understanding Plugin vs Skills vs MCP
          </h2>

          <p className="text-slate-600 mb-6">
            Claude Code has three extension mechanisms. Here&apos;s when to use each:
          </p>

          <div className="space-y-4">
            {/* MCP */}
            <div className="border border-slate-200 rounded-lg p-5 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">MCP (Model Context Protocol)</h4>
                  <p className="text-xs text-slate-500">External tools & APIs</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                MCP servers provide <strong>tools</strong> that Claude can call. They run as separate processes and can connect to databases, APIs, or run computations.
              </p>
              <div className="bg-white rounded border border-slate-200 p-3 text-sm">
                <p className="text-slate-700 font-medium mb-1">Polydev MCP provides:</p>
                <code className="text-blue-600">polydev_perspectives</code> - Query multiple AI models
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Use when:</strong> You need to call external APIs, run code, or access external resources
              </p>
            </div>

            {/* Skills */}
            <div className="border border-slate-200 rounded-lg p-5 bg-gradient-to-r from-green-50 to-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Skills (Slash Commands)</h4>
                  <p className="text-xs text-slate-500">Prompt templates</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Skills are <strong>markdown files</strong> that define slash commands. They provide instructions and context to Claude without running external code.
              </p>
              <div className="bg-white rounded border border-slate-200 p-3 text-sm">
                <p className="text-slate-700 font-medium mb-1">Polydev Skills provide:</p>
                <code className="text-green-600">/perspectives</code> - Get multi-model analysis<br/>
                <code className="text-green-600">/polydev-help</code> - Setup instructions
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Use when:</strong> You want quick commands that guide Claude&apos;s behavior
              </p>
            </div>

            {/* Plugin */}
            <div className="border border-slate-200 rounded-lg p-5 bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Puzzle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Plugin</h4>
                  <p className="text-xs text-slate-500">Bundle of MCP + Skills + CLAUDE.md</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                A plugin is a <strong>complete package</strong> that bundles MCP servers, Skills, and behavioral guidelines (CLAUDE.md) together for easy installation.
              </p>
              <div className="bg-white rounded border border-slate-200 p-3 text-sm">
                <p className="text-slate-700 font-medium mb-1">Polydev Plugin includes:</p>
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs mr-2">MCP Server</span>
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs mr-2">2 Skills</span>
                <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Auto-invocation rules</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Use when:</strong> You want one-click installation of a complete feature set
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-900">Feature</th>
                  <th className="text-center p-3 font-semibold text-slate-900">MCP</th>
                  <th className="text-center p-3 font-semibold text-slate-900">Skills</th>
                  <th className="text-center p-3 font-semibold text-slate-900">Plugin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 text-slate-600">Runs external code</td>
                  <td className="p-3 text-center">✓</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✓</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-600">Slash commands</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✓</td>
                  <td className="p-3 text-center">✓</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-600">Auto-invocation rules</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✓</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-600">One-click install</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✓</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-600">Marketplace available</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✗</td>
                  <td className="p-3 text-center">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Quick Start - Plugin Method */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Start: Install Polydev Plugin</h2>

          <p className="text-slate-600 mb-6">
            The easiest way to get Polydev running in Claude Code - one command installs everything:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Add the Polydev Marketplace</h4>
                <p className="text-slate-600 text-sm mb-2">
                  Run this command in Claude Code (or use <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/plugin</code> → Marketplaces → Add):
                </p>
                <CodeBlock
                  code="/plugin marketplace add backspacevenkat/polydev-claude-code-plugin"
                  index={0}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Install the Polydev Plugin</h4>
                <CodeBlock
                  code="/plugin install polydev"
                  index={1}
                />
                <p className="text-sm text-slate-500 mt-2">
                  Or use the Plugin Manager UI: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/plugin</code> → Discover → Search &quot;polydev&quot;
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Set Your API Token</h4>
                <p className="text-slate-600 text-sm mb-2">
                  Get your free token from <a href="https://polydev.ai/dashboard" className="text-slate-900 underline">polydev.ai/dashboard</a>, then add to your shell:
                </p>
                <CodeBlock
                  code='export POLYDEV_USER_TOKEN="your-token-here"'
                  index={2}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Restart Claude Code</h4>
                <p className="text-slate-600">
                  Exit and restart, or run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/mcp</code> to verify the polydev MCP is connected.
                </p>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="mt-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-3">What the plugin installs:</h4>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white rounded border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">MCP Server</span>
                </div>
                <p className="text-xs text-slate-500">polydev_perspectives tool for multi-model queries</p>
              </div>
              <div className="bg-white rounded border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Skills</span>
                </div>
                <p className="text-xs text-slate-500">/perspectives and /polydev-help commands</p>
              </div>
              <div className="bg-white rounded border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-sm">Auto-Invocation</span>
                </div>
                <p className="text-xs text-slate-500">CLAUDE.md rules for automatic triggering</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Auto-Invocation with CLAUDE.md */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Auto-Invocation: Make Polydev Automatic
          </h2>

          <p className="text-slate-600 mb-6">
            The Polydev plugin includes a <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">CLAUDE.md</code> file
            that tells Claude when to automatically invoke multi-model consultation without you asking.
          </p>

          <div className="bg-slate-900 rounded-lg p-5 mb-6">
            <p className="text-slate-400 text-xs mb-3">Plugin&apos;s CLAUDE.md auto-invocation rules:</p>
            <div className="text-sm text-slate-300 space-y-2">
              <p>✓ When you say you&apos;re &quot;stuck&quot; or &quot;confused&quot;</p>
              <p>✓ When asking comparison questions (&quot;Should I use X or Y?&quot;)</p>
              <p>✓ When requesting code reviews or security checks</p>
              <p>✓ After 2-3 failed debugging attempts</p>
              <p>✓ For architecture or design pattern questions</p>
              <p>✓ When you explicitly want multiple opinions</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-3">Add Custom Rules to Your CLAUDE.md</h3>

          <p className="text-slate-600 mb-3">
            You can add your own auto-invocation rules. Create or edit <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.claude/CLAUDE.md</code> (global)
            or <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">.claude/CLAUDE.md</code> (per-project):
          </p>

          <CodeBlock
            code={`# Auto-Invoke Polydev

## When to automatically use multi-model consultation:

1. **Debugging** - When I hit an error that persists after 2 attempts
2. **Architecture** - When choosing between technologies or patterns
3. **Security** - Always for authentication, authorization, or data handling
4. **Performance** - When optimizing code or database queries
5. **Code Review** - Before committing major changes

## How to invoke:

Use the polydev_perspectives MCP tool with a detailed question.
Synthesize the responses and highlight consensus vs differences.

## Example triggers:

- "I can't figure out why..."
- "Which is better: X or Y?"
- "Review this for security issues"
- "Help me optimize..."
- "I've tried X and Y but..."
`}
            index={3}
            language="markdown"
          />

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>💡 Pro tip:</strong> The more specific your CLAUDE.md rules, the more reliably Claude will auto-invoke Polydev.
              Include example phrases you commonly use when stuck.
            </p>
          </div>
        </motion.section>

        {/* Using Skills */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Using Polydev Skills</h2>

          <p className="text-slate-600 mb-6">
            After installing the plugin, you get access to these slash commands:
          </p>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <code className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono text-sm">/perspectives</code>
                <span className="text-xs text-slate-500">Main command</span>
              </div>
              <p className="text-slate-600 text-sm mb-3">
                Get multi-model AI perspectives on your current problem. Use it with or without arguments:
              </p>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                <p><code className="text-slate-700">/perspectives</code> - Analyzes current conversation context</p>
                <p><code className="text-slate-700">/perspectives Should I use Redis or PostgreSQL?</code> - Specific question</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <code className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono text-sm">/polydev-help</code>
                <span className="text-xs text-slate-500">Setup guide</span>
              </div>
              <p className="text-slate-600 text-sm">
                Displays setup instructions, available commands, and usage examples right in Claude Code.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Manual MCP Configuration */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Alternative: Manual MCP Configuration</h2>

          <p className="text-slate-600 mb-6">
            If you prefer not to use the plugin, you can manually configure just the MCP server:
          </p>

          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Configuration
          </h3>

          <p className="text-slate-600 mb-3">
            Edit <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.claude/settings.json</code>:
          </p>

          <CodeBlock
            code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": {
        "POLYDEV_USER_TOKEN": "your-token-here"
      }
    }
  }
}`}
            index={4}
            language="json"
          />

          <p className="text-sm text-slate-500 mt-3">
            <strong>Note:</strong> Manual configuration only gives you the MCP tools—no slash commands or auto-invocation.
            For the full experience, use the plugin.
          </p>
        </motion.section>

        {/* Usage Examples */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Usage Examples</h2>

          <div className="space-y-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Debugging Help</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;I&apos;m stuck on this React infinite re-render bug. Can you get perspectives from different models?&quot;</p>
              </div>
              <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-blue-800 font-medium">Claude invokes:</p>
                <code className="text-blue-600">mcp-execution → polydev_perspectives</code>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Claude consults GPT-4, Gemini, and Grok, then synthesizes their perspectives with code examples.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Architecture Decisions</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;Should I use Redis or PostgreSQL for session storage? /perspectives&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Get balanced recommendations from multiple AI models with different training data and perspectives.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Security Review</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;Review this auth implementation for security issues using polydev.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Multiple models catch different issues—one spots SQL injection while another notices timing attacks.
              </p>
            </div>
          </div>
        </motion.section>

        {/* When to Use */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">When to Use Multi-Model Consultation</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
              <h4 className="font-semibold text-slate-900 mb-2">✓ Best for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Complex debugging sessions</li>
                <li>• Architecture decisions</li>
                <li>• Security reviews</li>
                <li>• Ambiguous requirements</li>
                <li>• Performance optimization</li>
                <li>• When you&apos;re &quot;stuck&quot;</li>
              </ul>
            </div>
            <div className="border-l-4 border-slate-300 bg-slate-50 p-4 rounded-r-lg">
              <h4 className="font-semibold text-slate-900 mb-2">✗ Skip for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Simple syntax fixes</li>
                <li>• Well-documented APIs</li>
                <li>• Boilerplate generation</li>
                <li>• Clear, single-answer questions</li>
                <li>• Typo corrections</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Troubleshooting */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Troubleshooting</h2>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">MCP server not showing up?</h4>
              <p className="text-sm text-slate-600">
                Run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/mcp</code> in Claude Code to see
                connected servers. If Polydev isn&apos;t listed, check your POLYDEV_USER_TOKEN and restart Claude Code.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Plugin not installing?</h4>
              <p className="text-sm text-slate-600">
                Make sure the marketplace is added first. Run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/plugin</code> →
                Marketplaces tab to verify <code>polydev-marketplace</code> is listed.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Token issues?</h4>
              <p className="text-sm text-slate-600">
                Get your token from <a href="https://polydev.ai/dashboard" className="text-slate-900 underline">polydev.ai/dashboard</a>.
                Ensure it&apos;s exported: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">echo $POLYDEV_USER_TOKEN</code>
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Slow responses?</h4>
              <p className="text-sm text-slate-600">
                Multi-model consultation queries multiple APIs in parallel. Typical response time is 10-30 seconds
                depending on question complexity.
              </p>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-slate-200"
        >
          <div className="bg-slate-900 rounded-xl p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              Ready to get started?
            </h3>
            <p className="text-slate-400 mb-6 text-sm max-w-md mx-auto">
              Sign up for free and get your API token to start using multi-model consultation in Claude Code.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
              >
                Get Your Free Token
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://github.com/backspacevenkat/polydev-claude-code-plugin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-white border border-slate-700 rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                View Plugin on GitHub
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.section>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-3xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>
            <Link href="/articles" className="hover:text-slate-900 transition-colors">Articles</Link>
            {' · '}
            <Link href="/docs" className="hover:text-slate-900 transition-colors">Docs</Link>
            {' · '}
            <Link href="/" className="hover:text-slate-900 transition-colors">Polydev</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
