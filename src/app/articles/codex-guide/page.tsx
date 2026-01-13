'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Check, ArrowRight, ExternalLink, Terminal, Zap, Clock, Shield } from 'lucide-react'

export default function CodexGuidePage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const CodeBlock = ({ code, index, language = 'bash' }: { code: string; index: number; language?: string }) => (
    <div className="relative group">
      <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm border border-slate-700">
        <code className="text-slate-100 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, index)}
        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )

  const TerminalOutput = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-slate-400 ml-2 font-mono">Terminal</span>
      </div>
      <div className="p-4 font-mono text-sm text-slate-100 overflow-x-auto">
        {children}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <article className="max-w-4xl mx-auto px-6 py-16">
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
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
              Integration Guide
            </span>
            <span className="text-sm text-slate-400">January 2026</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6">
            Polydev + OpenAI Codex CLI
          </h1>

          <p className="text-xl text-slate-600 leading-relaxed">
            Add multi-model AI consultation to your Codex CLI workflow. Query GPT-5, Gemini 3, Claude Sonnet,
            and Grok simultaneously—directly from your terminal.
          </p>
        </motion.header>

        {/* Live Demo Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Terminal className="w-6 h-6 text-emerald-600" />
            Live Example: Authentication Best Practices
          </h2>

          <TerminalOutput>
            <div className="space-y-1">
              <p className="text-emerald-400">OpenAI Codex v0.77.0 (research preview)</p>
              <p className="text-slate-500">--------</p>
              <p><span className="text-slate-400">workdir:</span> /Users/venkat/Documents/polydev-ai</p>
              <p><span className="text-slate-400">model:</span> <span className="text-amber-400">gpt-5.1-codex-mini</span></p>
              <p><span className="text-slate-400">provider:</span> openai</p>
              <p className="text-slate-500">--------</p>
              <p className="text-cyan-400 mt-3">user</p>
              <p className="text-white">Call polydev.get_perspectives to get multi-model AI perspectives on:</p>
              <p className="text-white">What are the best practices for implementing authentication in a Next.js 15 app?</p>
              <p className="text-slate-500 mt-3">mcp: polydev starting</p>
              <p className="text-emerald-400">mcp: polydev ready</p>
              <p className="text-slate-500">mcp startup: ready: polydev, exa, vercel, filesystem, supabase, github</p>
              <p className="mt-3 text-slate-400">thinking</p>
              <p className="text-amber-400">**Planning to fetch perspectives data**</p>
              <p className="text-cyan-400 mt-2">tool polydev.get_perspectives(&#123;&quot;prompt&quot;:&quot;What are the best practices...&quot;&#125;)</p>
              <p className="text-emerald-400 font-semibold mt-2">polydev.get_perspectives success in 26.37s</p>
            </div>
          </TerminalOutput>

          <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Multi-Model Response</p>
            <div className="space-y-6">
              <div className="border-l-4 border-emerald-500 pl-4">
                <p className="font-semibold text-slate-900 mb-2">Gemini 3 Flash Preview (Google)</p>
                <p className="text-slate-600 text-sm">
                  I will search for authentication-related libraries and configurations in the codebase to understand the current implementation.
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4">
                <p className="font-semibold text-slate-900 mb-2">GPT-5.1 Codex Mini (OpenAI)</p>
                <ul className="text-slate-600 text-sm space-y-2">
                  <li>• Prefer the App Router&apos;s request handlers or middleware to run authentication logic server-side before rendering</li>
                  <li>• Use a battle-tested library (NextAuth.js, Clerk, or Supabase Auth) for token/session management</li>
                  <li>• Store secrets in environment variables and never commit them</li>
                  <li>• Guard API routes and page routes consistently using middleware.ts</li>
                  <li>• Issue short-lived access tokens with refresh tokens, stored in httpOnly cookies</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Latency: 26.37s | Tokens: 509 | Models consulted: 2</p>
          </div>
        </motion.section>

        {/* Quick Start */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Start: 60 Seconds to Multi-Model</h2>

          <div className="space-y-8">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">1</span>
                <p className="font-semibold text-slate-900">Get your Polydev token</p>
              </div>
              <p className="text-slate-600 mb-4 ml-11">
                Sign up at <a href="https://polydev.ai/dashboard" className="text-emerald-600 hover:underline font-medium">polydev.ai/dashboard</a> to get your free API token.
                Free tier includes 1,000 messages/month.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">2</span>
                <p className="font-semibold text-slate-900">Configure Codex MCP</p>
              </div>
              <p className="text-slate-600 mb-4 ml-11">
                Edit <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono text-slate-800">~/.codex/config.toml</code>:
              </p>
              <div className="ml-11">
                <CodeBlock
                  code={`[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest"]

[mcp_servers.polydev.env]
POLYDEV_USER_TOKEN = "pd_your_token_here"

[mcp_servers.polydev.timeouts]
tool_timeout = 180
session_timeout = 600`}
                  index={0}
                  language="toml"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">3</span>
                <p className="font-semibold text-slate-900">Verify installation</p>
              </div>
              <div className="ml-11">
                <CodeBlock
                  code={`$ codex mcp list

Name     Command  Status
polydev  npx      enabled`}
                  index={1}
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">4</span>
                <p className="font-semibold text-slate-900">Start using Polydev</p>
              </div>
              <div className="ml-11">
                <CodeBlock
                  code={`$ codex "Call polydev.get_perspectives to analyze my code"

# Or use exec for non-interactive mode:
$ codex exec "Use polydev to get perspectives on React best practices"`}
                  index={2}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What You Get</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Multi-Model Perspectives</h3>
              </div>
              <p className="text-slate-600 text-sm">
                Query GPT-5, Gemini 3 Flash, Claude Sonnet, and Grok in parallel. Get diverse AI opinions on any problem.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Native MCP Integration</h3>
              </div>
              <p className="text-slate-600 text-sm">
                Works seamlessly with Codex&apos;s MCP (Model Context Protocol). Just configure and use—no code changes needed.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Parallel Execution</h3>
              </div>
              <p className="text-slate-600 text-sm">
                All models queried simultaneously. Results in 10-30 seconds regardless of how many models you consult.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Managed API Keys</h3>
              </div>
              <p className="text-slate-600 text-sm">
                No need to manage keys for each provider. One Polydev token handles authentication to all models.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Second Example */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Terminal className="w-6 h-6 text-amber-600" />
            Live Example: Debugging React useEffect
          </h2>

          <TerminalOutput>
            <div className="space-y-1">
              <p className="text-emerald-400">OpenAI Codex v0.77.0 (research preview)</p>
              <p className="text-slate-500">--------</p>
              <p><span className="text-slate-400">model:</span> <span className="text-amber-400">gpt-5.1-codex-mini</span></p>
              <p className="text-slate-500">--------</p>
              <p className="text-cyan-400 mt-3">user</p>
              <p className="text-white">Call polydev.get_perspectives to get multi-model AI perspectives on:</p>
              <p className="text-white">Why does my React component re-render infinitely when using useEffect with an object dependency?</p>
              <p className="text-emerald-400 mt-3">mcp startup: ready: polydev, exa, vercel, memory, supabase, github</p>
              <p className="text-cyan-400 mt-2">tool polydev.get_perspectives(&#123;&quot;prompt&quot;:&quot;Why does my React component...&quot;&#125;)</p>
              <p className="text-emerald-400 font-semibold mt-2">polydev.get_perspectives success in 26.50s</p>
            </div>
          </TerminalOutput>

          <div className="mt-6 bg-white rounded-lg border border-slate-200 p-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Multi-Model Response</p>
            <div className="space-y-6">
              <div className="border-l-4 border-emerald-500 pl-4">
                <p className="font-semibold text-slate-900 mb-2">Gemini 3 Flash Preview</p>
                <p className="text-slate-600 text-sm">
                  I will search for useEffect usage in the src directory to see if there are any current examples of this issue in your codebase.
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4">
                <p className="font-semibold text-slate-900 mb-2">GPT-5.1 Codex Mini</p>
                <ul className="text-slate-600 text-sm space-y-2">
                  <li>• When you pass an object literal (even with the same values) to useEffect&apos;s dependency array, React sees a new reference every render</li>
                  <li>• The effect runs again and triggers a state change, causing another render—hence the infinite loop</li>
                  <li>• <strong>Fix:</strong> Memoize the object with <code className="bg-slate-100 px-1 rounded">useMemo</code>, keep values in separate primitives, or derive from stable refs/props</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Latency: 26.50s | Tokens: 230 | Models consulted: 2</p>
          </div>

          <div className="mt-6 bg-slate-900 rounded-lg border border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Codex Summary</p>
            <div className="text-slate-100 font-mono text-sm space-y-3">
              <p>• React sees object dependencies by reference, so passing a new literal (even with identical contents) makes each render supply a different reference</p>
              <p>• The effect runs each time, and if it updates state you loop</p>
              <p>• Keep that dependency stable by memoizing (<code className="text-amber-400">useMemo</code>), deriving it from primitives, or storing in a ref</p>
            </div>
          </div>
        </motion.section>

        {/* Use Cases */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Common Use Cases</h2>

          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Debugging & Troubleshooting</p>
              <CodeBlock
                code={`codex exec "Use polydev to debug: my API returns 500 when payload > 1MB"`}
                index={3}
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Architecture Decisions</p>
              <CodeBlock
                code={`codex exec "Call polydev.get_perspectives on: Redis vs PostgreSQL for session storage?"`}
                index={4}
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Code Reviews</p>
              <CodeBlock
                code={`codex exec "Use polydev to review this API for security issues: $(cat api.ts)"`}
                index={5}
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Best Practices</p>
              <CodeBlock
                code={`codex exec "Get multi-model perspectives on: optimizing React render performance"`}
                index={6}
              />
            </div>
          </div>
        </motion.section>

        {/* Shell Aliases */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Pro Tip: Shell Aliases</h2>

          <p className="text-slate-600 mb-4">
            Add to <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono text-slate-800">~/.zshrc</code> or <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono text-slate-800">~/.bashrc</code>:
          </p>

          <CodeBlock
            code={`# Quick multi-model consultation
alias poly='codex exec "Use polydev:"'

# Review code with AI ensemble
alias polyreview='codex exec "Use polydev to review:"'

# Debug with multi-model analysis
alias polydebug='codex exec "Use polydev to debug:"'

# Usage examples:
# poly "best way to implement WebSocket reconnection?"
# polyreview "$(cat src/api/auth.ts)"
# polydebug "TypeError: Cannot read property 'map' of undefined"`}
            index={7}
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
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Polydev not showing in <code className="text-sm">codex mcp list</code>?</p>
              <p className="text-slate-600 text-sm mb-3">
                Check your TOML syntax. Codex is strict about formatting:
              </p>
              <CodeBlock
                code={`# Correct (double quotes, proper sections)
[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest"]

# Wrong (single quotes won't work)
command = 'npx'  # This fails`}
                index={8}
                language="toml"
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Token not found errors?</p>
              <p className="text-slate-600 text-sm">
                Set the token in both your config.toml AND your shell environment:
              </p>
              <CodeBlock
                code={`# Add to ~/.zshrc
export POLYDEV_USER_TOKEN="pd_your_token_here"

# Then reload
source ~/.zshrc`}
                index={9}
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">npx path issues on macOS?</p>
              <p className="text-slate-600 text-sm mb-3">
                Use the full path to npx:
              </p>
              <CodeBlock
                code={`# Find your npx path
$ which npx
/Users/you/.nvm/versions/node/v22.20.0/bin/npx

# Use full path in config
command = "/Users/you/.nvm/versions/node/v22.20.0/bin/npx"`}
                index={10}
              />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <p className="font-semibold text-slate-900 mb-2">Timeouts on long queries?</p>
              <p className="text-slate-600 text-sm mb-3">
                Add timeout configuration to your config.toml:
              </p>
              <CodeBlock
                code={`[mcp_servers.polydev.timeouts]
tool_timeout = 180      # 3 minutes for multi-model queries
session_timeout = 600   # 10 minutes session timeout`}
                index={11}
                language="toml"
              />
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
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-2">Ready to supercharge your Codex CLI?</h3>
            <p className="text-slate-300 mb-6">Free tier: 1,000 messages/month. No credit card required.</p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
              >
                Get Your Free Token
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://openai.com/index/introducing-codex/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Codex CLI Docs
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.section>

        {/* Related */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <p className="text-sm text-slate-500 mb-4">Related guide:</p>
          <Link
            href="/articles/claude-code-guide"
            className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Polydev + Claude Code</p>
              <p className="text-sm text-slate-500">Set up multi-model consultation in Claude Code</p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
          </Link>
        </motion.section>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-400">
          <Link href="/articles" className="hover:text-slate-600 transition-colors">Articles</Link>
          {' · '}
          <Link href="/" className="hover:text-slate-600 transition-colors">Polydev</Link>
        </div>
      </footer>
    </div>
  )
}
