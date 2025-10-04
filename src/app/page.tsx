'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Code2, Sparkles, Zap, Check, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const PROVIDERS = [
  { name: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { name: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'xAI', logo: 'https://models.dev/logos/xai.svg' },
  { name: 'Groq', logo: 'https://models.dev/logos/groq.svg' },
  { name: 'OpenRouter', logo: 'https://models.dev/logos/openrouter.svg' }
]

const SUPPORTED_TOOLS = [
  { name: 'Claude Code', logo: 'https://sajalsharma.com/_astro/claude_code.GbHphWWe_Z29KFWg.webp.jpg' },
  { name: 'Cursor', logo: 'https://cdn.freelogovectors.net/wp-content/uploads/2025/06/cursor-logo-freelogovectors.net_.png' },
  { name: 'Cline', logo: 'https://cline.bot/assets/branding/logos/cline-wordmark-black.svg' },
  { name: 'VS Code', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg' }
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Multi-Model Perspectives',
    description: 'Query Claude, GPT, Gemini, and more simultaneously. Get diverse solutions when you\'re stuck.'
  },
  {
    icon: Zap,
    title: 'Intelligent Routing',
    description: 'Automatic fallback from CLI tools to API keys to credits. Always get the best response at the lowest cost.'
  },
  {
    icon: Code2,
    title: 'Zero Setup',
    description: 'Works instantly with your existing Claude Desktop, Cline, or Cursor installation. No configuration needed.'
  }
]

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({ models: 346, providers: 37 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/models-dev/providers')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()

        let totalModels = 0
        let totalProviders = 0

        Object.values(data).forEach((provider: any) => {
          if (provider?.supportedModels) {
            const modelCount = Object.keys(provider.supportedModels).length
            if (modelCount > 0) {
              totalModels += modelCount
              totalProviders += 1
            }
          }
        })

        if (totalModels > 0) {
          setStats({ models: totalModels, providers: totalProviders })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="font-bold text-xl text-gray-900">
              Polydev
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Docs
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              {authLoading ? null : user ? (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 mb-8">
              <Sparkles className="h-4 w-4" />
              <span>Access {stats.models}+ models from {stats.providers}+ providers</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Get Multiple AI Perspectives
              <br />
              <span className="text-gray-500">When You're Stuck</span>
            </h1>

            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Query multiple AI models simultaneously through your favorite coding assistant.
              Works instantly with Claude Desktop, Cline, Cursor, and more.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!user && (
                <Link
                  href="/auth"
                  className="px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center space-x-2 group"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              <Link
                href="/docs"
                className="px-8 py-4 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Read Documentation
              </Link>
            </div>
          </motion.div>

          {/* Code Example */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-sm font-mono">MCP Tool Call</span>
              </div>
              <pre className="text-gray-100 font-mono text-sm leading-relaxed overflow-x-auto">
                <code>{`await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Help me debug excessive React re-renders",
    models: ["gpt-4", "claude-3-opus", "gemini-pro"],
    project_memory: "full"
  }
});

// Returns perspectives from multiple models
// Automatically uses CLI tools → API keys → credits`}</code>
              </pre>
            </div>
          </motion.div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-gray-50 to-transparent -z-10"></div>
      </section>

      {/* Providers */}
      <section className="py-16 border-y border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-gray-600 mb-12 text-sm uppercase tracking-wide font-medium">
            Supported Providers
          </p>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center">
            {PROVIDERS.map((provider) => (
              <div key={provider.name} className="relative group">
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for developers who want the best AI responses without the complexity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-gray-900" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Works With Your Tools
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Integrates seamlessly with your existing development environment
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {SUPPORTED_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-4 hover:border-gray-300 hover:shadow-md transition-all duration-300"
              >
                <img
                  src={tool.logo}
                  alt={tool.name}
                  className="h-12 w-auto object-contain"
                />
                <span className="text-sm font-medium text-gray-700">{tool.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/docs/mcp-integration"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <span>See all integrations</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Simple Setup
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with your existing tools
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Install',
                description: 'Add Polydev to your Claude Desktop, Cline, or Cursor config'
              },
              {
                step: '2',
                title: 'Ask',
                description: 'Request perspectives when you need diverse solutions'
              },
              {
                step: '3',
                title: 'Choose',
                description: 'Review responses from multiple AI models and pick the best'
              }
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="absolute -top-4 -left-4 h-12 w-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div className="bg-gray-50 p-8 pt-12 rounded-2xl border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Get Multiple Perspectives?
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Start querying multiple AI models through your favorite coding assistant
          </p>
          {!user && (
            <Link
              href="/auth"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors font-medium group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="font-bold text-xl text-gray-900 mb-4">Polydev</div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Multi-model AI perspectives for developers
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/docs" className="hover:text-gray-900 transition-colors">Documentation</Link></li>
                <li><Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="https://github.com/polydev-ai" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a></li>
                <li><Link href="/docs/mcp-integration" className="hover:text-gray-900 transition-colors">MCP Integration</Link></li>
                <li><Link href="/docs" className="hover:text-gray-900 transition-colors">API Reference</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-gray-900 transition-colors">About</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            © 2025 Polydev AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
