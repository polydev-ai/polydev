'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Copy, Check, ArrowRight } from 'lucide-react'

export default function ClineGuidePage() {
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
            Using Polydev with Cline
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Get multi-model AI perspectives directly in Cline (VS Code/Cursor extension). When you need different viewpoints on a bug,
            architecture decision, or code review, Polydev queries multiple AI models in parallel.
          </p>
        </motion.header>

        {/* MCP Settings Screenshot */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src="/screenshots/cline/mcp-servers.png"
              alt="Cline MCP Servers showing Polydev configured"
              width={1200}
              height={600}
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 mt-3 text-center">
            Cline MCP Servers panel with Polydev configured
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
                {' '}Get your free API token from{' '}
                <a href="https://polydev.ai/dashboard/mcp-tokens" className="underline text-blue-600 hover:text-blue-800">polydev.ai/dashboard/mcp-tokens</a>
              </p>
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">2</span>
                {' '}Ensure Node.js is installed (required for npx):
              </p>
              <CodeBlock
                code={`# Check if Node.js is installed
node --version

# If not installed, get it from https://nodejs.org`}
                index={0}
                language="bash"
              />
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">3</span>
                {' '}(Optional) Install the Polydev package globally:
              </p>
              <CodeBlock
                code={`npm install -g polydev-ai`}
                index={10}
                language="bash"
              />
              <p className="text-sm text-slate-500 mt-2">
                Or let npx handle it automatically in the config below.
              </p>
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">4</span>
                {' '}Open Cline settings: Click the gear icon → &quot;MCP Servers&quot; → &quot;Configure&quot;
              </p>
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">5</span>
                {' '}Add Polydev to your Cline MCP config:
              </p>
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
                index={1}
                language="json"
              />
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">6</span>
                {' '}Click &quot;Done&quot; and verify Polydev appears in the MCP Servers list with a green indicator
              </p>
            </div>
          </div>
        </motion.section>

        {/* What you get */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What Polydev adds</h2>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">MCP Tool</p>
              <p className="text-sm text-slate-600">
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">get_perspectives</code>
                {' '}— queries multiple AI models in parallel for diverse viewpoints
              </p>
            </div>
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">Response time</p>
              <p className="text-sm text-slate-600">
                10-40 seconds (parallel queries to multiple providers)
              </p>
            </div>
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">Use cases</p>
              <p className="text-sm text-slate-600">
                Debugging, architecture decisions, code reviews, security analysis
              </p>
            </div>
          </div>
        </motion.section>

        {/* Example */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Example: useEffect debugging</h2>

          <p className="text-slate-600 mb-4">
            In Cline chat, type: <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">Use polydev to help answer: What are common causes of React useEffect infinite loops?</code>
          </p>

          <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm mb-4">
            <Image
              src="/screenshots/cline/polydev-prompt.png"
              alt="Polydev prompt in Cline"
              width={1200}
              height={600}
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 text-center mb-8">
            Typing a polydev prompt in Cline
          </p>

          <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src="/screenshots/cline/polydev-response.png"
              alt="Polydev response in Cline"
              width={1200}
              height={600}
              className="w-full"
            />
          </div>
          <p className="text-sm text-slate-500 mt-3 text-center">
            Cline processes the request and queries multiple AI models
          </p>
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
            Just mention "polydev" or "perspectives" in your prompt. Cline will call the MCP tool:
          </p>

          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Debugging</p>
              <p className="text-slate-600 text-sm font-mono">"Use polydev to debug this infinite loop"</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Architecture</p>
              <p className="text-slate-600 text-sm font-mono">"Get perspectives on: Redis vs PostgreSQL for caching?"</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Code review</p>
              <p className="text-slate-600 text-sm font-mono">"Use polydev to review this API for security issues"</p>
            </div>
          </div>
        </motion.section>

        {/* Cline-specific tips */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Cline-specific tips</h2>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-slate-900 mb-1">Auto-approve the tool</p>
              <p className="text-sm text-slate-600">
                In MCP Servers settings, enable auto-approve for <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">get_perspectives</code> to skip confirmation prompts.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Works with @file mentions</p>
              <p className="text-sm text-slate-600">
                Combine Polydev with Cline's @file mentions for context-aware multi-model consultation.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Increase timeout</p>
              <p className="text-sm text-slate-600">
                Set <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">"timeout": 240</code> in your config for longer queries.
              </p>
            </div>
          </div>
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
              <p className="font-medium text-slate-900 mb-1">MCP not showing up?</p>
              <p className="text-sm text-slate-600">
                Check JSON syntax in your config file. Ensure proper commas and quotes.
                Try clicking "Restart Server" in the MCP Servers panel.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Token not found?</p>
              <p className="text-sm text-slate-600">
                Verify your token starts with <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">pd_</code> and is correctly set in the env section.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">npx path issues?</p>
              <p className="text-sm text-slate-600">
                Use the full path: find it with <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">which npx</code>, then use that in your config.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Slow responses?</p>
              <p className="text-sm text-slate-600">
                Multi-model queries take 10-40 seconds since they call multiple APIs in parallel.
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
                href="https://github.com/cline/cline"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cline GitHub
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
