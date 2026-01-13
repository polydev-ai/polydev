'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Code, Copy, Check, ArrowRight, Zap, MessageSquare, Settings, FolderOpen, Terminal } from 'lucide-react'

export default function CursorGuidePage() {
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
            Using Polydev with Cursor
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Integrate Polydev into your Cursor workflow. Access GPT, Claude, Gemini, and Grok
            perspectives without leaving your editor.
          </p>

          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-slate-200">
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Cursor</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">MCP</span>
            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">IDE Integration</span>
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
            Get Polydev running in Cursor in under 2 minutes:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Install Polydev MCP</h4>
                <CodeBlock
                  code="npx polydev-ai@latest --cursor"
                  index={0}
                />
                <p className="text-sm text-slate-500 mt-2">
                  This automatically configures the MCP server for Cursor.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Restart Cursor</h4>
                <p className="text-slate-600">
                  Close and reopen Cursor to load the new MCP server. You can also reload the window
                  with <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">Cmd+Shift+P</code> &rarr; &quot;Reload Window&quot;.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Use in Chat or Composer</h4>
                <p className="text-slate-600 mb-3">
                  Ask Cursor&apos;s AI to consult other models when you need different perspectives:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
                  &quot;Use polydev to get different AI perspectives on this database schema design.&quot;
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
            Create or edit <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.cursor/mcp.json</code>:
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
            For project-specific setup, create <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">.cursor/mcp.json</code> in your project root:
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

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Cursor uses <code className="px-1 py-0.5 bg-amber-100 rounded">mcp.json</code> (not settings.json)
              for MCP server configuration, unlike Claude Code.
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
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Usage Examples</h2>

          <div className="space-y-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">In Cursor Chat</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;This API is returning 500 errors intermittently. Use polydev to get perspectives from different AI models on what could cause this.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                The AI will query GPT-4, Claude, Gemini, and Grok in parallel to provide diverse debugging perspectives.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">In Cursor Composer</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;I need to implement real-time notifications. Get polydev perspectives on WebSockets vs Server-Sent Events vs polling for my use case.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Get architecture recommendations from multiple AI models before making implementation decisions.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-slate-500" />
                <h4 className="font-semibold text-slate-900">Performance Review</h4>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 mb-2">You say:</p>
                <p className="text-slate-900">&quot;Review this SQL query for performance. Use polydev to check if multiple AI models spot any optimization opportunities.&quot;</p>
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Different models may catch different issues - indexes, query plans, N+1 problems, etc.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Cursor-Specific Features */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Cursor-Specific Tips</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Use with @codebase</h4>
              <p className="text-sm text-slate-600">
                Combine Polydev with Cursor&apos;s @codebase feature for context-aware multi-model consultation.
                The AI can reference your entire codebase when querying other models.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Composer Integration</h4>
              <p className="text-sm text-slate-600">
                In multi-file edits with Composer, ask for Polydev perspectives before applying changes.
                This helps catch issues before they&apos;re spread across multiple files.
              </p>
            </div>

            <div className="border-l-4 border-slate-900 pl-4 py-2">
              <h4 className="font-semibold text-slate-900 mb-1">Diff Review</h4>
              <p className="text-sm text-slate-600">
                Before accepting AI-generated diffs, you can ask Polydev to review the proposed changes
                from multiple model perspectives.
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
                <li>Complex architecture decisions</li>
                <li>Debugging mysterious bugs</li>
                <li>Security and performance reviews</li>
                <li>API design discussions</li>
                <li>Choosing between libraries/approaches</li>
              </ul>
            </div>
            <div className="border-l-2 border-slate-300 bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Skip for:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>Simple code completions</li>
                <li>Standard CRUD operations</li>
                <li>Well-documented library usage</li>
                <li>Quick syntax lookups</li>
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
              <h4 className="font-semibold text-slate-900 mb-2">MCP server not available?</h4>
              <p className="text-sm text-slate-600">
                Check that <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">~/.cursor/mcp.json</code> exists
                and has valid JSON syntax. Restart Cursor after making changes.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">npx command not found?</h4>
              <p className="text-sm text-slate-600">
                Ensure Node.js is installed and npx is in your PATH. Run <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">which npx</code> to
                verify, then use the full path in your mcp.json if needed.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 mb-2">API key issues?</h4>
              <p className="text-sm text-slate-600">
                Get your API key from <a href="https://polydev.ai/dashboard" className="text-slate-900 underline">polydev.ai/dashboard</a> and
                add it to the env section of your mcp.json configuration.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Verify Installation */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Verify Installation</h2>

          <p className="text-slate-600 mb-4">
            To verify Polydev is properly configured, try this in Cursor Chat:
          </p>

          <CodeBlock
            code={`"What MCP servers do you have access to? Can you list them?"`}
            index={10}
          />

          <p className="text-sm text-slate-500 mt-3">
            If configured correctly, the AI should mention &quot;polydev&quot; as an available MCP server.
          </p>
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
              Sign up for free and get your API key to start using multi-model consultation in Cursor.
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
