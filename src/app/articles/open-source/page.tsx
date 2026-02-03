'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Github, Terminal, Code, Server, CheckCircle, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export default function OpenSourceArticle() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const CodeBlock = ({ code, index, language = 'bash' }: { code: string; index: number; language?: string }) => (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, index)}
        className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copiedIndex === index ? (
          <CheckCircle className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-slate-300" />
        )}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Articles
          </Link>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Title Section */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
              Open Source
            </span>
            <span className="text-slate-400 text-sm">January 2026</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Polydev is Now Open Source
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Self-host Polydev with your own API keys. Get multi-model AI perspectives
            for your coding agents without any external dependencies.
          </p>
        </header>

        {/* Hero Image/Logo */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
            <Image
              src="/logo.png"
              alt="Polydev Logo"
              width={120}
              height={120}
              className="mx-auto"
            />
          </div>
        </div>

        {/* Introduction */}
        <section className="prose prose-slate max-w-none mb-12">
          <p className="text-lg text-slate-700 leading-relaxed">
            We're excited to announce that Polydev is now fully open source. You can
            self-host the entire platform using your own API keys from OpenAI, Anthropic,
            Google, and X.AI. No external service required.
          </p>

          <div className="flex items-center gap-4 my-8">
            <a
              href="https://github.com/polydev-ai/polydev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors no-underline"
            >
              <Github className="h-5 w-5" />
              View on GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/polydev-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors no-underline"
            >
              <ExternalLink className="h-5 w-5" />
              npm Package
            </a>
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Terminal className="h-6 w-6 text-slate-600" />
            Quick Start
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Option 1: Use the Hosted Service (Easiest)
              </h3>
              <p className="text-slate-600 mb-4">
                Get started instantly with our hosted service. No setup required.
              </p>
              <CodeBlock
                code={`# Install the MCP server
npx polydev-ai@latest

# Get your token from polydev.ai/dashboard/mcp-tokens
export POLYDEV_USER_TOKEN="pd_your_token_here"`}
                index={0}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">
                Option 2: Self-Host with Your Own API Keys
              </h3>
              <p className="text-slate-600 mb-4">
                Full control over your data and API keys. Bring your own credentials.
              </p>
              <CodeBlock
                code={`# Clone the repository
git clone https://github.com/polydev-ai/polydev.git
cd polydev

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your API keys to .env.local

# Start the server
npm run dev`}
                index={1}
              />
            </div>
          </div>
        </section>

        {/* Environment Configuration */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Code className="h-6 w-6 text-slate-600" />
            Environment Configuration
          </h2>

          <p className="text-slate-600 mb-4">
            Create a <code className="bg-slate-100 px-2 py-1 rounded text-sm">.env.local</code> file
            with your API keys:
          </p>

          <CodeBlock
            code={`# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers (add the ones you want to use)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...

# Feature Flags (self-hosted defaults)
NEXT_PUBLIC_CREDITS_ENABLED=false
NEXT_PUBLIC_CHAT_ENABLED=true
NEXT_PUBLIC_SUBSCRIPTION_ENABLED=false
NEXT_PUBLIC_IS_HOSTED=false`}
            index={2}
            language="bash"
          />

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Tip:</strong> You only need to configure the AI providers you want to use.
              Polydev will automatically use available providers for multi-model consultation.
            </p>
          </div>
        </section>

        {/* IDE Integration */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <Server className="h-6 w-6 text-slate-600" />
            IDE Integration
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Claude Code</h3>
              <CodeBlock
                code={`claude mcp add polydev -- npx -y polydev-ai@latest`}
                index={3}
              />
              <p className="text-slate-600 mt-3 text-sm">
                Or add to your <code className="bg-slate-100 px-1 rounded">~/.claude.json</code>:
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
                index={4}
                language="json"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Cursor / Windsurf / Cline</h3>
              <p className="text-slate-600 mb-3">Add to your MCP configuration:</p>
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

            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">OpenAI Codex CLI</h3>
              <p className="text-slate-600 mb-3">
                Add to <code className="bg-slate-100 px-1 rounded">~/.codex/config.toml</code>:
              </p>
              <CodeBlock
                code={`[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest"]

[mcp_servers.polydev.env]
POLYDEV_USER_TOKEN = "pd_your_token_here"

[mcp_servers.polydev.timeouts]
tool_timeout = 180
session_timeout = 600`}
                index={6}
                language="toml"
              />
            </div>
          </div>
        </section>

        {/* Feature Flags */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Feature Flags</h2>

          <p className="text-slate-600 mb-6">
            Polydev uses feature flags to control which features are enabled. This allows
            the same codebase to power both the open-source and hosted versions.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Flag</th>
                  <th className="border border-slate-200 px-4 py-3 text-left font-semibold text-slate-900">Description</th>
                  <th className="border border-slate-200 px-4 py-3 text-center font-semibold text-slate-900">Self-Hosted</th>
                  <th className="border border-slate-200 px-4 py-3 text-center font-semibold text-slate-900">Hosted</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { flag: 'NEXT_PUBLIC_CREDITS_ENABLED', desc: 'Credits system for API usage', self: 'false', hosted: 'true' },
                  { flag: 'NEXT_PUBLIC_CHAT_ENABLED', desc: 'Multi-model chat interface', self: 'true', hosted: 'true' },
                  { flag: 'NEXT_PUBLIC_SUBSCRIPTION_ENABLED', desc: 'Stripe subscription tiers', self: 'false', hosted: 'true' },
                  { flag: 'NEXT_PUBLIC_ADMIN_ENABLED', desc: 'Admin panel for management', self: 'false', hosted: 'true' },
                  { flag: 'NEXT_PUBLIC_REFERRALS_ENABLED', desc: 'Referral program', self: 'false', hosted: 'true' },
                  { flag: 'NEXT_PUBLIC_IS_HOSTED', desc: 'Hosted version indicator', self: 'false', hosted: 'true' },
                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 px-4 py-3 font-mono text-sm text-slate-700">{row.flag}</td>
                    <td className="border border-slate-200 px-4 py-3 text-slate-600">{row.desc}</td>
                    <td className="border border-slate-200 px-4 py-3 text-center">
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm">{row.self}</code>
                    </td>
                    <td className="border border-slate-200 px-4 py-3 text-center">
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm">{row.hosted}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Usage</h2>

          <p className="text-slate-600 mb-4">
            Once connected, your AI agent can call the <code className="bg-slate-100 px-2 py-1 rounded text-sm">get_perspectives</code> tool:
          </p>

          <CodeBlock
            code={`{
  "tool": "get_perspectives",
  "arguments": {
    "prompt": "How should I refactor this authentication flow?"
  }
}`}
            index={7}
            language="json"
          />

          <p className="text-slate-600 mt-6 mb-4">
            Or simply mention "polydev" or "perspectives" in your prompt:
          </p>

          <CodeBlock
            code={`"Use polydev to debug this infinite loop"
"Get perspectives on: Should I use Redis or PostgreSQL for caching?"`}
            index={8}
          />
        </section>

        {/* Comparison */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Self-Hosted vs Hosted</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Self-Hosted</h3>
              <ul className="space-y-3">
                {[
                  'Full control over your data',
                  'Use your own API keys',
                  'No external dependencies',
                  'Customize as needed',
                  'MIT licensed',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Hosted (polydev.ai)</h3>
              <ul className="space-y-3">
                {[
                  'Zero setup required',
                  'Managed API keys',
                  'Usage dashboard & analytics',
                  'Team collaboration',
                  '500 free credits to start',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-200">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="inline-block mt-6 px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Get Started Free →
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-8 mt-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-slate-600">
              <p className="font-medium text-slate-900">Polydev</p>
              <p className="text-sm">Multi-model perspectives for your coding agents</p>
            </div>
            <div className="flex gap-4">
              <a
                href="https://github.com/polydev-ai/polydev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}
