'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Copy, Check, ArrowRight } from 'lucide-react'

export default function ClaudeCodeGuidePage() {
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
            <span className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
              Guide
            </span>
            <span className="text-sm text-slate-400">January 2026</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-6">
            Using Polydev with Claude Code
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Get unstuck faster by consulting multiple AI models. When Claude alone can&apos;t solve your bug,
            Polydev queries GPT-4, Gemini, and Grok in parallel—different training data catches different issues.
          </p>
        </motion.header>

        {/* Main screenshot */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src="/screenshots/polydev-mcp-response.png"
              alt="Polydev multi-model response in Claude Code"
              width={1200}
              height={800}
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 mt-3 text-center">
            Claude Code calling Polydev MCP to get perspectives from GPT-4, Gemini, and Grok
          </p>
        </motion.section>

        {/* Quick install */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Install in 60 seconds</h2>

          <div className="space-y-6">
            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">1</span>
                {' '}Add the marketplace:
              </p>
              <CodeBlock
                code="/plugin marketplace add backspacevenkat/polydev-claude-code-plugin"
                index={0}
              />
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">2</span>
                {' '}Install the plugin:
              </p>
              <CodeBlock
                code="/plugin install polydev"
                index={1}
              />
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">3</span>
                {' '}Set your token (get one free at{' '}
                <a href="https://polydev.ai/dashboard" className="underline">polydev.ai/dashboard</a>):
              </p>
              <CodeBlock
                code='export POLYDEV_USER_TOKEN="your-token-here"'
                index={2}
              />
            </div>

            <div>
              <p className="text-slate-600">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">4</span>
                {' '}Restart Claude Code. Run <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">/mcp</code> to verify.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Plugin screenshot */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src="/screenshots/polydev-plugin-install.png"
              alt="Polydev plugin in Claude Code plugin manager"
              width={1200}
              height={800}
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 mt-3 text-center">
            Finding Polydev in the Claude Code plugin manager
          </p>
        </motion.section>

        {/* What you get */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What the plugin installs</h2>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">MCP Server</p>
              <p className="text-sm text-slate-600">
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">polydev_perspectives</code>
                {' '}— tool that queries GPT-4, Gemini, and Grok in parallel
              </p>
            </div>
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">Slash commands</p>
              <p className="text-sm text-slate-600">
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/perspectives</code>
                {' '}and{' '}
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/polydev-help</code>
              </p>
            </div>
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">Auto-invocation rules</p>
              <p className="text-sm text-slate-600">
                CLAUDE.md config that triggers multi-model consultation when you say &quot;stuck&quot;, ask comparison questions, or request security reviews
              </p>
            </div>
          </div>
        </motion.section>

        {/* How to use */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How to use it</h2>

          <p className="text-slate-600 mb-6">
            Just describe your problem. Claude will automatically call Polydev when it makes sense,
            or you can explicitly ask:
          </p>

          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Debugging</p>
              <p className="text-slate-600 text-sm">&quot;I&apos;m stuck on this React infinite re-render. Get different perspectives.&quot;</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Architecture</p>
              <p className="text-slate-600 text-sm">&quot;Should I use Redis or PostgreSQL for session storage? /perspectives&quot;</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Security review</p>
              <p className="text-slate-600 text-sm">&quot;Review this auth implementation using polydev.&quot;</p>
            </div>
          </div>

          {/* Code fixes screenshot */}
          <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src="/screenshots/polydev-code-fixes.png"
              alt="Polydev showing code fixes from multiple models"
              width={1200}
              height={800}
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 mt-3 text-center">
            Multi-model consensus showing bug patterns and fixes
          </p>
        </motion.section>

        {/* Plugin vs MCP vs Skills */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Plugin vs MCP vs Skills</h2>

          <p className="text-slate-600 mb-6">
            Claude Code has three extension mechanisms. The Polydev plugin bundles all three:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-4 font-medium text-slate-900"></th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">MCP</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Skills</th>
                  <th className="text-left py-3 pl-4 font-medium text-slate-900">Plugin</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4">What it is</td>
                  <td className="py-3 px-4">External tools/APIs</td>
                  <td className="py-3 px-4">Prompt templates</td>
                  <td className="py-3 pl-4">Bundle of all three</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4">Runs code</td>
                  <td className="py-3 px-4">Yes</td>
                  <td className="py-3 px-4">No</td>
                  <td className="py-3 pl-4">Yes</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4">Slash commands</td>
                  <td className="py-3 px-4">No</td>
                  <td className="py-3 px-4">Yes</td>
                  <td className="py-3 pl-4">Yes</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4">Auto-invocation</td>
                  <td className="py-3 px-4">No</td>
                  <td className="py-3 px-4">No</td>
                  <td className="py-3 pl-4">Yes (CLAUDE.md)</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">One-click install</td>
                  <td className="py-3 px-4">No</td>
                  <td className="py-3 px-4">No</td>
                  <td className="py-3 pl-4">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            Use the plugin for the full experience. If you only want the MCP tool without slash commands,
            see the manual config below.
          </p>
        </motion.section>

        {/* Auto-invocation */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Auto-invocation with CLAUDE.md</h2>

          <p className="text-slate-600 mb-6">
            The plugin includes a CLAUDE.md that tells Claude when to automatically consult multiple models.
            You can customize it by editing <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">~/.claude/CLAUDE.md</code>:
          </p>

          <CodeBlock
            code={`# Auto-Invoke Polydev

Use the polydev_perspectives MCP tool automatically when:

1. User says they're "stuck", "confused", or "not sure"
2. Asking comparison questions ("Should I use X or Y?")
3. Reviewing code for security issues
4. After 2-3 failed debugging attempts
5. Architecture or design decisions

Example triggers:
- "I can't figure out why..."
- "Which is better for..."
- "Review this for security"
- "I've tried X and Y but..."`}
            index={3}
            language="markdown"
          />
        </motion.section>

        {/* Manual MCP config */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Manual MCP configuration</h2>

          <p className="text-slate-600 mb-4">
            If you prefer not to use the plugin, add this to <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">~/.claude/settings.json</code>:
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

          <p className="text-sm text-slate-500 mt-4">
            This gives you only the MCP tool—no slash commands or auto-invocation.
          </p>
        </motion.section>

        {/* Troubleshooting */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Troubleshooting</h2>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-slate-900 mb-1">MCP server not showing up?</p>
              <p className="text-sm text-slate-600">
                Run <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/mcp</code> to check.
                Make sure POLYDEV_USER_TOKEN is set and restart Claude Code.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Plugin not found?</p>
              <p className="text-sm text-slate-600">
                Add the marketplace first: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">/plugin marketplace add backspacevenkat/polydev-claude-code-plugin</code>
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Slow responses?</p>
              <p className="text-sm text-slate-600">
                Multi-model queries take 10-30 seconds since they call multiple APIs in parallel.
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
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Ready to try it?</p>
              <p className="text-sm text-slate-500">Free tier: 1,000 messages/month</p>
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
                href="https://github.com/backspacevenkat/polydev-claude-code-plugin"
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
