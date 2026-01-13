'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Terminal, Copy, Check, ArrowRight, Zap, MessageSquare, Settings, FolderOpen } from 'lucide-react'

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
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Multi-Model AI</span>
          </div>
        </motion.header>

        {/* Quick Start */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Start</h2>

          <p className="text-slate-600 mb-6">
            Get Polydev running in Claude Code in under 2 minutes:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Install Polydev MCP</h4>
                <CodeBlock
                  code="npx polydev-ai@latest"
                  index={0}
                />
                <p className="text-sm text-slate-500 mt-2">
                  This automatically configures the MCP server for Claude Code.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Restart Claude Code</h4>
                <p className="text-slate-600">
                  Close and reopen Claude Code (or run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/mcp</code> to refresh).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Start using multi-model consultation</h4>
                <p className="text-slate-600 mb-3">
                  Ask Claude to consult other models when you need different perspectives:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
                  &quot;I&apos;m stuck on this authentication bug. Can you use Polydev to get perspectives from other AI models?&quot;
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Manual Configuration */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Manual Configuration</h2>

          <p className="text-slate-600 mb-6">
            If the automatic installer doesn&apos;t work, you can manually configure Polydev:
          </p>

          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Global Configuration
          </h3>

          <p className="text-slate-600 mb-3">
            Edit your Claude Code settings file at <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.claude/settings.json</code>:
          </p>

          <CodeBlock
            code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest", "serve"],
      "env": {
        "POLYDEV_API_KEY": "your-api-key-here"
      }
    }
  }
}`}
            index={1}
            language="json"
          />

          <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Project-Specific Configuration
          </h3>

          <p className="text-slate-600 mb-3">
            For project-specific setup, create <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">.claude/settings.json</code> in your project root:
          </p>

          <CodeBlock
            code={`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest", "serve"]
    }
  }
}`}
            index={2}
            language="json"
          />
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
                <p className="text-slate-900">&quot;This React component is re-rendering infinitely. Use polydev to get different perspectives on what might be causing it.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Claude will consult GPT-4, Gemini, and Grok, then synthesize their perspectives to help debug.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Architecture Decisions</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;Should I use Redis or PostgreSQL for session storage? Get polydev perspectives.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Get balanced recommendations from multiple AI models with different training data and perspectives.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Code Review</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;Review this authentication implementation. Use polydev to check for security issues I might have missed.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Multiple models catch different issues - one might spot SQL injection while another notices timing attacks.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Advanced: Skills & Plugins */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Advanced: Creating a Polydev Skill</h2>

          <p className="text-slate-600 mb-6">
            For power users, you can create a custom slash command that automatically invokes Polydev.
            Create a <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">.claude/commands/perspectives.md</code> file:
          </p>

          <CodeBlock
            code={`# /perspectives - Get multi-model AI perspectives

When the user runs this command, use the Polydev MCP server to consult
multiple AI models (GPT-4, Gemini, Grok) about the current problem or question.

## Instructions

1. Identify the user's current problem or question from the conversation context
2. Call polydev.getPerspectives() with a detailed description of the issue
3. Synthesize the responses into actionable recommendations
4. Highlight where models agree and where they differ

## Example Usage

User: /perspectives
(Claude will analyze the current context and get multi-model feedback)`}
            index={3}
            language="markdown"
          />

          <p className="text-slate-600 mt-4">
            Now you can simply type <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">/perspectives</code> in Claude Code
            to instantly get multi-model consultation on your current problem.
          </p>
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
            <div className="border-l-2 border-slate-900 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Best for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Complex debugging sessions</li>
                <li>• Architecture decisions</li>
                <li>• Security reviews</li>
                <li>• Ambiguous requirements</li>
                <li>• Performance optimization</li>
              </ul>
            </div>
            <div className="border-l-2 border-slate-300 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Skip for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Simple syntax fixes</li>
                <li>• Well-documented APIs</li>
                <li>• Boilerplate generation</li>
                <li>• Clear, single-answer questions</li>
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
                connected servers. If Polydev isn&apos;t listed, check your settings.json syntax and restart Claude Code.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">API key issues?</h4>
              <p className="text-sm text-slate-600">
                Get your API key from <a href="https://polydev.ai/dashboard" className="text-slate-900 underline">polydev.ai/dashboard</a> and
                add it to your environment or settings.json.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Slow responses?</h4>
              <p className="text-sm text-slate-600">
                Multi-model consultation queries multiple APIs in parallel. If responses are slow,
                check your network connection or try reducing the number of models consulted.
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
              Sign up for free and get your API key to start using multi-model consultation in Claude Code.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
              >
                Get Your API Key
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-white border border-slate-700 rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                View Full Docs
              </Link>
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
