'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Check, ArrowRight, ExternalLink } from 'lucide-react'

export default function CodexGuidePage() {
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
            Using Polydev with OpenAI Codex CLI
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Add multi-model AI consultation to Codex CLI. When you&apos;re stuck or need different perspectives,
            Polydev queries GPT-4, Claude, Gemini, and Grok in parallel—directly from your terminal.
          </p>
        </motion.header>

        {/* Demo output */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] font-mono text-sm overflow-x-auto">
            <div className="text-[#7d8590] mb-2">$ codex exec &quot;Use polydev to get perspectives on rate limiting&quot;</div>
            <div className="text-[#e6edf3] space-y-1">
              <p className="text-[#58a6ff]">mcp: polydev ready</p>
              <p className="text-[#7d8590]">tool polydev.get_perspectives(...)</p>
              <p className="text-[#3fb950]">polydev.get_perspectives success in 48.25s</p>
              <p className="mt-3 text-[#e6edf3]"><span className="text-[#f0883e]">**Rate Limiting Guidance**</span></p>
              <p className="text-[#8b949e]">- Cover multiple scopes (service-wide, per client, per action)</p>
              <p className="text-[#8b949e]">- Prefer token bucket or leaky bucket algorithms...</p>
              <p className="text-[#8b949e]">- Push enforcement close to the edge—CDN for DDoS, gateway for API keys...</p>
              <p className="mt-2 text-[#7d8590]">Gathered via polydev (models: gpt-4, claude-3-sonnet, gemini-pro)</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-3 text-center">
            Codex CLI calling Polydev MCP to get multi-model perspectives
          </p>
        </motion.section>

        {/* Quick Start */}
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
                {' '}Add Polydev MCP to your Codex config. Edit <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">~/.codex/config.toml</code>:
              </p>
              <CodeBlock
                code={`[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest"]

[mcp_servers.polydev.env]
POLYDEV_USER_TOKEN = "your-token-here"`}
                index={0}
                language="toml"
              />
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">2</span>
                {' '}Get your free token from{' '}
                <a href="https://polydev.ai/dashboard" className="underline">polydev.ai/dashboard</a>
              </p>
            </div>

            <div>
              <p className="text-slate-600 mb-3">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">3</span>
                {' '}Optionally set the token in your shell for easier access:
              </p>
              <CodeBlock
                code='export POLYDEV_USER_TOKEN="your-token-here"'
                index={1}
              />
            </div>

            <div>
              <p className="text-slate-600">
                <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">4</span>
                {' '}Verify with <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">codex mcp list</code>
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
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What Polydev adds to Codex</h2>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">MCP Tool</p>
              <p className="text-sm text-slate-600">
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">polydev.get_perspectives</code>
                {' '}— queries GPT-4, Claude, Gemini, and Grok in parallel
              </p>
            </div>
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">Use cases</p>
              <p className="text-sm text-slate-600">
                Debugging, architecture decisions, code reviews, security analysis—anytime you want multiple AI opinions
              </p>
            </div>
            <div className="p-4">
              <p className="font-medium text-slate-900 mb-1">Response time</p>
              <p className="text-sm text-slate-600">
                10-50 seconds (queries multiple APIs in parallel)
              </p>
            </div>
          </div>
        </motion.section>

        {/* Usage */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How to use it</h2>

          <p className="text-slate-600 mb-6">
            Just mention &quot;polydev&quot; or &quot;perspectives&quot; in your prompt. Codex will call the MCP tool:
          </p>

          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Debugging</p>
              <code className="text-slate-600 text-sm">codex &quot;Use polydev to debug this React infinite loop&quot;</code>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Architecture</p>
              <code className="text-slate-600 text-sm">codex &quot;Get perspectives on: Redis vs PostgreSQL for caching?&quot;</code>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-900 text-sm font-medium mb-2">Code review</p>
              <code className="text-slate-600 text-sm">codex &quot;Use polydev to review this API for security: $(cat api.js)&quot;</code>
            </div>
          </div>

          {/* Example output */}
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Example response</h3>
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] font-mono text-xs overflow-x-auto">
            <pre className="text-[#e6edf3]">{`# Multiple AI Perspectives

Got 1/1 perspectives in 15904ms using 2087 tokens.
📋 Plan: Free (active)
📨 Messages: 399/1000 used this month

## GEMINI-3-FLASH-PREVIEW (google)
Implementing rate limiting is a critical architectural decision...

*   **Token Bucket:** A "bucket" holds tokens; each request
    consumes one. Tokens are added at a fixed rate.
*   **Leaky Bucket:** Requests enter a bucket and are processed
    at a constant "drip" rate.
*   **Fixed Window Counter:** Limits requests per fixed timeframe.

### Best Practices
- Communicate via Headers (X-RateLimit-Limit, Retry-After)
- Use a Distributed Store (Redis or Memcached)
- Implement Tiered Limits (Free: 1k/day, Pro: 100k/day)

*Tokens: 2087, Latency: 15904ms, Cost: $0.004956*`}</pre>
          </div>
        </motion.section>

        {/* Interactive vs Exec */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Interactive vs Non-Interactive</h2>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-slate-900 mb-2">Interactive mode</p>
              <CodeBlock
                code='codex "Use polydev to analyze this codebase"'
                index={2}
              />
              <p className="text-sm text-slate-500 mt-2">
                Opens an interactive session where you can follow up
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-2">Non-interactive (exec)</p>
              <CodeBlock
                code='codex exec "Use polydev: best practice for JWT auth?"'
                index={3}
              />
              <p className="text-sm text-slate-500 mt-2">
                Runs once and exits—good for scripts and CI
              </p>
            </div>
          </div>
        </motion.section>

        {/* Shell aliases */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Handy shell aliases</h2>

          <p className="text-slate-600 mb-4">
            Add to <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">~/.zshrc</code> or <code className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded">~/.bashrc</code>:
          </p>

          <CodeBlock
            code={`# Quick multi-model consultation
alias poly='codex exec "Use polydev:"'

# Review code with polydev
alias polyreview='codex exec "Use polydev to review:"'

# Debug with polydev
alias polydebug='codex exec "Use polydev to debug:"'

# Usage:
# poly "best way to implement caching?"
# polyreview "$(cat api.py)"
# polydebug "this error: TypeError undefined"`}
            index={4}
          />
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
              <p className="font-medium text-slate-900 mb-1">MCP not showing in list?</p>
              <p className="text-sm text-slate-600">
                Check <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">~/.codex/config.toml</code> syntax.
                TOML is strict—ensure proper quoting and section headers.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Token not found?</p>
              <p className="text-sm text-slate-600">
                Set it in both config.toml and your shell environment.
                Run <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">echo $POLYDEV_USER_TOKEN</code> to verify.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">npx path issues?</p>
              <p className="text-sm text-slate-600">
                Use the full path: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">command = &quot;/usr/local/bin/npx&quot;</code>
                (find with <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">which npx</code>)
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-900 mb-1">Slow responses?</p>
              <p className="text-sm text-slate-600">
                Multi-model queries take 10-50 seconds since they call multiple APIs in parallel.
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
                href="https://openai.com/index/introducing-codex/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Codex CLI Docs
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
