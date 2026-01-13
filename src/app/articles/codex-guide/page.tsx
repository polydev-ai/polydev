'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, Copy, Check, ArrowRight, MessageSquare, Settings, Terminal, FileCode } from 'lucide-react'

export default function CodexGuidePage() {
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
            Using Polydev with OpenAI Codex CLI
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Combine OpenAI Codex with multi-model consultation for enhanced code generation
            and debugging capabilities directly in your terminal.
          </p>

          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-slate-200">
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Codex CLI</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">OpenAI</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Terminal</span>
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
            Get Polydev running with OpenAI Codex CLI in under 2 minutes:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Install Polydev MCP</h4>
                <CodeBlock
                  code="npx polydev-ai@latest --codex"
                  index={0}
                />
                <p className="text-sm text-slate-500 mt-2">
                  This automatically configures the MCP server for Codex CLI.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Restart your terminal</h4>
                <p className="text-slate-600">
                  Open a new terminal session to load the updated configuration.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Use multi-model consultation</h4>
                <p className="text-slate-600 mb-3">
                  Ask Codex to consult other models for complex problems:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 font-mono">
                  codex &quot;Use polydev to get different perspectives on implementing a rate limiter&quot;
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
            Codex CLI Configuration (TOML)
          </h3>

          <p className="text-slate-600 mb-3">
            Create or edit <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.codex/config.toml</code>:
          </p>

          <CodeBlock
            code={`[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest", "serve"]

[mcp_servers.polydev.env]
POLYDEV_API_KEY = "your-api-key-here"`}
            index={1}
            language="toml"
          />

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Codex CLI uses TOML format (not JSON) for configuration.
              The file is located at <code className="px-1 py-0.5 bg-amber-100 rounded">~/.codex/config.toml</code>.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-3 mt-8 flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Alternative: Environment Variable
          </h3>

          <p className="text-slate-600 mb-3">
            You can also set the API key as an environment variable in your shell profile:
          </p>

          <CodeBlock
            code={`# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export POLYDEV_API_KEY="your-api-key-here"`}
            index={2}
            language="bash"
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
                <Terminal className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Quick Consultation</h4>
              </div>
              <CodeBlock
                code={`codex "Use polydev to compare approaches for implementing JWT authentication"`}
                index={3}
              />
              <p className="text-sm text-slate-500 mt-3">
                Get quick multi-model perspectives on implementation approaches.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Debugging Session</h4>
              </div>
              <CodeBlock
                code={`codex "This function returns undefined. Use polydev to get debugging perspectives:
$(cat problematic_function.js)"`}
                index={4}
              />
              <p className="text-sm text-slate-500 mt-3">
                Pipe code directly to get multi-model debugging analysis.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Architecture Review</h4>
              </div>
              <CodeBlock
                code={`codex "Review this schema design. Use polydev for multi-model feedback:
CREATE TABLE users (...)
CREATE TABLE orders (...)"`}
                index={5}
              />
              <p className="text-sm text-slate-500 mt-3">
                Get architecture feedback from GPT, Claude, Gemini, and Grok.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Codex-Specific Tips */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Codex CLI Tips</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Pipe File Contents</h4>
              <p className="text-sm text-slate-600">
                Use command substitution to include file contents: <code className="px-1 py-0.5 bg-slate-100 rounded">$(cat file.py)</code>.
                This gives Polydev full context for better analysis.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Full Auto Mode</h4>
              <p className="text-sm text-slate-600">
                Run <code className="px-1 py-0.5 bg-slate-100 rounded">codex --full-auto</code> to let Codex automatically
                execute suggested changes. Combine with Polydev for validated auto-execution.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Scripting Integration</h4>
              <p className="text-sm text-slate-600">
                Codex CLI integrates well with shell scripts. Use Polydev consultation in
                automated workflows for code generation validation.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Git Integration</h4>
              <p className="text-sm text-slate-600">
                Combine with git diff: <code className="px-1 py-0.5 bg-slate-100 rounded">codex &quot;Use polydev to review: $(git diff)&quot;</code>
                for multi-model code review before commits.
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
            <div className="border-l-2 border-slate-900 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Best for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>Complex implementation decisions</li>
                <li>Debugging stubborn issues</li>
                <li>Security-sensitive code review</li>
                <li>Performance optimization</li>
                <li>API design validation</li>
              </ul>
            </div>
            <div className="border-l-2 border-slate-300 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Skip for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>Simple shell commands</li>
                <li>Quick syntax lookups</li>
                <li>Standard file operations</li>
                <li>One-liner scripts</li>
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
              <h4 className="font-semibold text-slate-900 mb-2">MCP server not found?</h4>
              <p className="text-sm text-slate-600">
                Verify the TOML syntax in <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.codex/config.toml</code>.
                TOML is sensitive to formatting - ensure proper quoting and indentation.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">npx command issues?</h4>
              <p className="text-sm text-slate-600">
                If npx isn&apos;t in PATH for Codex, use the full path:
                <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm ml-1">/usr/local/bin/npx</code>
                (find with <code className="px-1 py-0.5 bg-slate-100 rounded">which npx</code>).
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">API key not working?</h4>
              <p className="text-sm text-slate-600">
                Get your API key from <a href="https://polydev.ai/dashboard" className="text-slate-900 underline">polydev.ai/dashboard</a>.
                Set it either in config.toml or as an environment variable.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Check Codex version?</h4>
              <p className="text-sm text-slate-600">
                Run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">codex --version</code> to ensure you have
                a recent version that supports MCP servers.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Advanced Usage */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Advanced: Shell Aliases</h2>

          <p className="text-slate-600 mb-4">
            Create convenient aliases for common Polydev consultation patterns:
          </p>

          <CodeBlock
            code={`# Add to ~/.bashrc or ~/.zshrc

# Quick multi-model consultation
alias poly='codex "Use polydev to analyze:"'

# Code review with polydev
alias polyreview='codex "Use polydev to review this code for issues:"'

# Debug with polydev
alias polydebug='codex "Use polydev to debug this issue:"'

# Architecture consultation
alias polyarch='codex "Use polydev for architecture recommendations on:"'`}
            index={6}
            language="bash"
          />

          <p className="text-slate-600 mt-4">
            Example usage:
          </p>

          <CodeBlock
            code={`poly "Should I use Redis or Memcached for this caching use case?"
polyreview "$(cat api.py)"
polydebug "TypeError: undefined is not a function in line 42"`}
            index={7}
          />
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
              Sign up for free and get your API key to start using multi-model consultation with Codex CLI.
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
