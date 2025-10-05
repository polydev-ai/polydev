'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, Zap, Cpu, Terminal, Globe } from 'lucide-react'
import Link from 'next/link'

export default function IntegrationsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const integrations = [
    {
      id: 'mcp',
      title: 'Model Context Protocol (MCP)',
      description: 'Connect Polydev to Claude Desktop, Cline, and other MCP-compatible editors',
      icon: <Zap className="w-6 h-6" />,
      category: 'Editor Integration',
      link: '/docs/mcp-integration',
      featured: true
    },
    {
      id: 'api',
      title: 'REST API',
      description: 'Integrate Polydev into your applications with our REST API',
      icon: <Globe className="w-6 h-6" />,
      category: 'API Integration',
      code: `curl -X POST https://api.polydev.ai/v1/perspectives \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Review this code for security issues",
    "models": ["anthropic/claude-opus-4", "openai/gpt-4"]
  }'`
    },
    {
      id: 'cli',
      title: 'CLI Tools',
      description: 'Memory extraction and context sharing across development tools',
      icon: <Terminal className="w-6 h-6" />,
      category: 'Development Tools',
      code: `# Install Polydev CLI
npm install -g @polydev/cli

# Extract memory from development tools
polydev memory extract --tools=all

# Get perspectives with context
polydev perspectives "Optimize this database query"`
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      description: 'Receive real-time notifications about model responses and usage',
      icon: <Cpu className="w-6 h-6" />,
      category: 'Real-time Integration',
      code: `{
  "webhook_url": "https://your-app.com/webhooks/polydev",
  "events": ["perspective.completed", "usage.threshold"],
  "secret": "your_webhook_secret"
}`
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Integrations
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Connect Polydev to your development workflow with our comprehensive integration options
          </p>
        </div>

        {/* Featured Integration */}
        {integrations.filter(i => i.featured).map((integration) => (
          <div key={integration.id} className="mb-12 p-8 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-6">
              <div className="p-3 rounded-xl bg-slate-900 text-white">
                {integration.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900">{integration.title}</h2>
                  <span className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-900 border border-slate-200 rounded-full">
                    Featured
                  </span>
                </div>
                <p className="text-slate-600 mb-4">{integration.description}</p>
                <Link
                  href={integration.link!}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-all duration-200"
                >
                  Get Started
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Integration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {integrations.filter(i => !i.featured).map((integration) => (
            <div key={integration.id} className="p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                  {integration.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{integration.title}</h3>
                  <span className="text-sm text-slate-500">{integration.category}</span>
                </div>
              </div>

              <p className="text-slate-600 mb-4">{integration.description}</p>

              {integration.code && (
                <div className="mb-4">
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{integration.code}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(integration.code!, integration.id)}
                      className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                    >
                      {copiedCode === integration.id ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Need a Custom Integration?
          </h2>
          <p className="text-slate-600 mb-6">
            We're always expanding our integration ecosystem. Let us know what you need.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Contact Us
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}