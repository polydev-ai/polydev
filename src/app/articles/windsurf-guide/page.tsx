'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageSquare, Copy, Check, ArrowRight, Zap, Settings, FolderOpen, Terminal, Sparkles } from 'lucide-react'

export default function WindsurfGuidePage() {
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
            Using Polydev with Windsurf
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Add multi-model AI consultation to your Windsurf IDE setup for smarter code suggestions
            and problem-solving with Cascade.
          </p>

          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-slate-200">
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Windsurf</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">MCP</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Cascade</span>
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
            Get Polydev running in Windsurf in under 2 minutes:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Install Polydev MCP</h4>
                <CodeBlock
                  code="npx polydev-ai@latest --windsurf"
                  index={0}
                />
                <p className="text-sm text-slate-500 mt-2">
                  This automatically configures the MCP server for Windsurf.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Restart Windsurf</h4>
                <p className="text-slate-600">
                  Close and reopen Windsurf to load the new MCP server. Cascade will automatically
                  detect the new tool.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Use with Cascade</h4>
                <p className="text-slate-600 mb-3">
                  Ask Cascade to consult other models when you need different perspectives:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
                  &quot;I&apos;m designing a caching strategy. Can you use Polydev to get perspectives from GPT, Claude, and Gemini?&quot;
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
            Windsurf MCP Configuration
          </h3>

          <p className="text-slate-600 mb-3">
            Create or edit <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.codeium/windsurf/mcp_config.json</code>:
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
            Alternative: Settings UI
          </h3>

          <p className="text-slate-600 mb-3">
            You can also configure MCP servers through Windsurf&apos;s settings:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-slate-600 mb-4">
            <li>Open Windsurf Settings (<code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">Cmd+,</code>)</li>
            <li>Search for &quot;MCP&quot; or navigate to Extensions &rarr; Cascade</li>
            <li>Find the MCP Servers configuration section</li>
            <li>Add a new server with the configuration above</li>
          </ol>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Windsurf uses <code className="px-1 py-0.5 bg-amber-100 rounded">mcp_config.json</code> in
              the <code className="px-1 py-0.5 bg-amber-100 rounded">~/.codeium/windsurf/</code> directory.
            </p>
          </div>
        </motion.section>

        {/* Usage Examples */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Usage Examples with Cascade</h2>

          <div className="space-y-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Cascade Flow Integration</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;I need to refactor this authentication flow. Use polydev to get recommendations from multiple AI models before we make changes.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Cascade will query multiple models and incorporate their perspectives into its suggested changes.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Multi-File Analysis</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;Review these database models for any design issues. Get polydev perspectives on the relationships and indexes.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Windsurf&apos;s multi-file context combined with multi-model consultation catches more issues.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Performance Optimization</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;This React component is slow. Use polydev to get optimization strategies from different AI models.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Different models suggest different optimization approaches - memoization, virtualization, code splitting, etc.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Windsurf-Specific Features */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Windsurf-Specific Tips</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Cascade Flows + Polydev</h4>
              <p className="text-sm text-slate-600">
                When Cascade proposes a flow of changes, ask for Polydev perspectives before accepting.
                This adds a multi-model review layer to Windsurf&apos;s agentic coding.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Supercomplete Enhancement</h4>
              <p className="text-sm text-slate-600">
                For complex code completions, ask Cascade to validate Supercomplete suggestions with
                Polydev before accepting them.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Multi-Repository Context</h4>
              <p className="text-sm text-slate-600">
                Windsurf&apos;s workspace awareness combined with Polydev gives you multi-model consultation
                that understands your entire project structure.
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
                <li>Before accepting Cascade flows</li>
                <li>Complex refactoring decisions</li>
                <li>Security-sensitive code</li>
                <li>Architecture discussions</li>
                <li>Debugging elusive bugs</li>
              </ul>
            </div>
            <div className="border-l-2 border-slate-300 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Skip for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>Simple autocompletions</li>
                <li>Routine code changes</li>
                <li>Standard boilerplate</li>
                <li>Documentation updates</li>
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
              <h4 className="font-semibold text-slate-900 mb-2">MCP server not connecting?</h4>
              <p className="text-sm text-slate-600">
                Check that <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.codeium/windsurf/mcp_config.json</code> exists
                and has valid JSON. Restart Windsurf completely after making changes.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Cascade not using Polydev?</h4>
              <p className="text-sm text-slate-600">
                Explicitly mention &quot;polydev&quot; in your prompt. Try: &quot;Use the polydev MCP server to get
                perspectives from other AI models.&quot;
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Slow responses?</h4>
              <p className="text-sm text-slate-600">
                Multi-model consultation adds latency as it queries multiple APIs. For quick tasks,
                skip Polydev. Use it strategically for complex problems.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Config file location?</h4>
              <p className="text-sm text-slate-600">
                On macOS: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.codeium/windsurf/mcp_config.json</code><br/>
                On Windows: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">%USERPROFILE%\.codeium\windsurf\mcp_config.json</code><br/>
                On Linux: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.codeium/windsurf/mcp_config.json</code>
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
              Sign up for free and get your API key to start using multi-model consultation in Windsurf.
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
