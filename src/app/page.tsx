'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../hooks/useAuth'

const fetchModelsDevStats = async () => {
  try {
    const response = await fetch('/api/models-dev/providers')
    if (!response.ok) throw new Error('models.dev fetch failed')
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

    return {
      totalModels: totalModels || 346,
      totalProviders: totalProviders || 37
    }
  } catch (error) {
    console.error('Failed to fetch models.dev stats:', error)
    return { totalModels: 346, totalProviders: 37 }
  }
}

const SUPPORTED_EDITORS = [
  { name: 'Cursor', logo: 'https://cdn.freelogovectors.net/wp-content/uploads/2025/06/cursor-logo-freelogovectors.net_.png' },
  { name: 'Claude Code', logo: 'https://sajalsharma.com/_astro/claude_code.GbHphWWe_Z29KFWg.webp.jpg' },
  { name: 'Continue', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIHtPAJsmkLkem2H02zTflsqpNC-V6kwIcEQ&s' },
  { name: 'Cline', logo: 'https://cline.bot/assets/branding/logos/cline-wordmark-black.svg' },
  { name: 'Zed', logo: 'https://zed.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_icon.d67dc948.webp&w=750&q=100' },
  { name: 'VS Code', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg' }
]

const TOP_MODELS = [
  {
    name: 'GPT-5',
    provider: 'OpenAI',
    logo: 'https://models.dev/logos/openai.svg',
    description: 'Advanced reasoning and coding',
    badge: 'NEW'
  },
  {
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    logo: 'https://models.dev/logos/anthropic.svg',
    description: 'Best-in-class for complex tasks',
    badge: 'POPULAR'
  },
  {
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png',
    description: '2M token context window',
    badge: null
  },
  {
    name: 'Grok 4 High',
    provider: 'xAI',
    logo: 'https://models.dev/logos/xai.svg',
    description: 'High reasoning capabilities',
    badge: 'HOT'
  }
]

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Never switch contexts',
    description: 'Get answers from multiple AI models without leaving your editor or breaking your flow.'
  },
  {
    icon: '🔄',
    title: 'Compare responses instantly',
    description: 'See GPT-5, Claude, Gemini, and others respond side-by-side to pick the best solution.'
  },
  {
    icon: '💰',
    title: 'Smart cost optimization',
    description: 'Uses your free CLI tools first, then API keys, then credits - saving you money automatically.'
  }
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect your editor',
    description: 'Install Polydev in Cursor, VS Code, or your favorite AI coding assistant in under 2 minutes.'
  },
  {
    step: '02',
    title: 'Ask your question',
    description: 'Type normally in your editor. When you need multiple perspectives, just mention @polydev.'
  },
  {
    step: '03',
    title: 'Get all the answers',
    description: 'Multiple AI models respond in parallel. Compare, choose, and keep coding without missing a beat.'
  }
]

const ROUTING_ORDER = [
  {
    title: 'Prefer local CLIs',
    text: 'If Codex, Claude Code, or Gemini CLI are logged in, Polydev uses them first. Fast, familiar, and zero extra spend.'
  },
  {
    title: 'Then your API keys',
    text: 'Encrypted OpenAI, Anthropic, Google, Groq, DeepSeek and more. Per-key budgets and defaults live in the dashboard.'
  },
  {
    title: 'Credits as a safety net',
    text: 'Use Polydev credits backed by our OpenRouter account when teammates are unconfigured or you are on a fresh machine.'
  }
]

const ACCURACY_STACK = [
  {
    title: 'Cross-check answers',
    text: 'Ask several models and reconcile differences. Reduce single-model blind spots.'
  },
  {
    title: 'Quick tests',
    text: 'Generate tiny assertions or unit tests to catch issues before commit time.'
  },
  {
    title: 'Project memory',
    text: 'Attach minimal, encrypted repo context so answers match your codebase and constraints.'
  },
  {
    title: 'Second pass',
    text: 'Have a different model review and tighten the final patch when it matters.'
  }
]

const ARCHITECTURE_HELP = [
  { title: 'Service boundaries', text: 'Sketch APIs, queues, and background jobs for new features in minutes.' },
  { title: 'Data layer choices', text: 'Pick schema, indexes, caching, and RLS that fit your workload.' },
  { title: 'Agent patterns', text: 'Design MCP tool flows that are predictable and easy to debug.' },
  { title: 'Scale & observability', text: 'Plan logging, cost controls, and safe fallbacks before launch.' }
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <div className="mx-auto max-w-4xl">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-800 mb-8">
                MCP server / editor native / parallel model replies
              </span>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                Get unstuck. Better answers, stronger design, same editor.
              </h1>
              <p className="mt-6 text-xl leading-8 text-slate-600 max-w-3xl mx-auto">
                Polydev sends your prompt to several top models at once (GPT-5, Claude Opus 4, Gemini 2.5 Pro, Grok 4 High and more), adds just enough project context, and streams the results into the chat you already use.
              </p>
              <div className="mt-10 flex items-center justify-center gap-6">
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth'}
                  className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-500 transition-all duration-200 hover:scale-105"
                >
                  {isAuthenticated ? 'Open Dashboard' : 'Start Free Trial'}
                </Link>
                <Link
                  href="/docs"
                  className="rounded-full border-2 border-slate-300 px-8 py-4 text-lg font-semibold text-slate-900 hover:bg-slate-50 transition-all duration-200"
                >
                  Watch Demo
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{modelStats.totalModels}+</div>
              <div className="mt-2 text-lg text-slate-600">Models available</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{modelStats.totalProviders}+</div>
              <div className="mt-2 text-lg text-slate-600">Providers supported</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">1.7 s</div>
              <div className="mt-2 text-lg text-slate-600">Median response</div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Editors */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-lg text-slate-600 mb-12">Works seamlessly with your favorite coding tools</p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
            {SUPPORTED_EDITORS.map((editor) => (
              <div key={editor.name} className="flex flex-col items-center">
                <div className="relative h-12 w-12 mb-3">
                  <Image src={editor.logo} alt={`${editor.name} logo`} fill className="object-contain" />
                </div>
                <span className="text-sm font-medium text-slate-700">{editor.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              Why developers choose Polydev
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              The fastest way to get multiple AI perspectives without the context switching
            </p>
          </div>
          <div className="grid gap-12 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                <p className="text-lg text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Models */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              Latest AI models, instantly available
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Access the newest and most powerful models as soon as they're released
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {TOP_MODELS.map((model) => (
              <div key={model.name} className="relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-shadow">
                {model.badge && (
                  <span className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-bold rounded-full ${
                    model.badge === 'NEW' ? 'bg-green-100 text-green-800' :
                    model.badge === 'POPULAR' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {model.badge}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-10 w-10">
                    <Image src={model.logo} alt={`${model.provider} logo`} fill className="object-contain" />
                  </div>
                  <span className="text-sm text-slate-600">{model.provider}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{model.name}</h3>
                <p className="text-slate-600">{model.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              How Polydev works
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Get started in minutes, not hours
            </p>
          </div>
          <div className="grid gap-12 lg:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-lg text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Routing order */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">How Polydev routes a request</h2>
            <p className="mt-4 text-xl text-slate-600">Fast first, cheap second, safety third.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {ROUTING_ORDER.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accuracy stack */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Accuracy stack</h2>
            <p className="mt-4 text-xl text-slate-600">Tools that make better answers stick.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ACCURACY_STACK.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                <p className="mt-2 text-sm text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture help */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Architecture help when you need it</h2>
            <p className="mt-4 text-xl text-slate-600">Ask for tradeoffs and blueprints, not vague suggestions.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ARCHITECTURE_HELP.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                <p className="mt-2 text-sm text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & control */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Privacy and control</h2>
            <p className="mt-4 text-xl text-slate-600">Designed for teams who care about data boundaries.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Zero-knowledge memory</div>
              <p className="mt-2 text-sm text-slate-600">Context is encrypted client-side and only minimal snippets are attached when needed.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Clear routing</div>
              <p className="mt-2 text-sm text-slate-600">Every run shows which path answered (CLI, key, or credit) with token and cost details.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Supabase security</div>
              <p className="mt-2 text-sm text-slate-600">RLS policies protect per-user data; service-role actions are limited to backend jobs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Give your editor a safety net</h2>
          <p className="mt-6 text-xl text-slate-600">
            100 free runs to start. Unlimited for 20 dollars a month when you are ready.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-blue-500 transition-all duration-200 hover:scale-105"
            >
              {isAuthenticated ? 'Open dashboard' : 'Create workspace'}
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border-2 border-slate-300 px-8 py-4 text-lg font-semibold text-slate-900 hover:bg-slate-50 transition-all duration-200"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">* No credit card required • Cancel anytime</p>
        </div>
      </section>
    </div>
  )
}
