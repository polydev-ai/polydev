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
    icon: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    ),
    title: 'Never leave your editor',
    description: 'Get multiple AI perspectives without breaking your flow. Ask once, get answers from several top models instantly.'
  },
  {
    icon: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    title: 'Catch more bugs, faster',
    description: 'Different models spot different issues. Compare responses to find edge cases, logic errors, and better solutions you might miss with just one AI.'
  },
  {
    icon: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
    ),
    title: 'Smart cost optimization',
    description: 'Uses your free CLI tools first, then your API keys, then credits as backup. Get the best answers while minimizing costs automatically.'
  }
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Initialize MCP connection',
    description: 'Install Polydev MCP server in Cursor, Claude Code, or Continue. Automatic discovery of local CLI credentials and API keys.'
  },
  {
    step: '02',
    title: 'Query distributed models',
    description: 'Submit prompts through your editor. Polydev routes to multiple models simultaneously, aggregating encrypted project context when needed.'
  },
  {
    step: '03',
    title: 'Compare and synthesize',
    description: 'Review parallel responses from frontier models. Cross-validate architecture decisions and eliminate single-point cognitive failures.'
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
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-violet-50">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.02)_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Floating model logos */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-12 h-12 opacity-10">
            <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" fill className="object-contain" />
          </div>
          <div className="absolute top-32 right-20 w-10 h-10 opacity-10">
            <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" fill className="object-contain" />
          </div>
          <div className="absolute bottom-40 left-20 w-14 h-14 opacity-10">
            <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" alt="Google" fill className="object-contain" />
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <div className="mx-auto max-w-4xl">
              <span className="inline-flex items-center rounded-full bg-orange-100 border border-orange-200 px-4 py-1.5 text-sm font-mono text-orange-700 mb-8">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                MCP-native • Multi-model • Zero-knowledge memory
              </span>
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                Get unstuck faster.<br />
                <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">Debug smarter. Design better.</span>
              </h1>
              <p className="mt-6 text-xl leading-8 text-slate-600 max-w-3xl mx-auto">
                When one AI model isn't enough, get answers from GPT-5, Claude Opus 4, Gemini 2.5 Pro, and 340+ others simultaneously.
                Compare solutions, catch edge cases, and improve your code accuracy without leaving your editor.
              </p>

              {/* Model logos showcase */}
              <div className="mt-8 flex items-center justify-center gap-6">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>Powered by:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 relative">
                      <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" fill className="object-contain" />
                    </div>
                    <div className="w-6 h-6 relative">
                      <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" fill className="object-contain" />
                    </div>
                    <div className="w-6 h-6 relative">
                      <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" alt="Google" fill className="object-contain" />
                    </div>
                    <div className="w-6 h-6 relative">
                      <Image src="https://models.dev/logos/xai.svg" alt="xAI" fill className="object-contain" />
                    </div>
                    <span className="text-orange-600 font-medium">+37 providers</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-6">
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth'}
                  className="group relative overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/25 transition-all duration-300 hover:shadow-orange-500/40 hover:scale-105"
                >
                  {isAuthenticated ? 'Launch Console' : 'Initialize Workspace'}
                </Link>
                <Link
                  href="/docs"
                  className="group rounded-full border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-slate-700 transition-all duration-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                >
                  <span className="flex items-center gap-2">
                    Architecture Docs
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-16">
            <div className="text-center group">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">{modelStats.totalModels}+</div>
              <div className="mt-2 text-lg text-slate-600 group-hover:text-orange-600 transition-colors">Models available</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">{modelStats.totalProviders}+</div>
              <div className="mt-2 text-lg text-slate-600 group-hover:text-orange-600 transition-colors">Providers supported</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">1.7 s</div>
              <div className="mt-2 text-lg text-slate-600 group-hover:text-orange-600 transition-colors">Median response</div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Editors */}
      <section className="py-16 bg-gradient-to-r from-orange-50 to-violet-50">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-lg text-slate-600 mb-12">Works with the tools you already use</p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {SUPPORTED_EDITORS.map((editor) => (
              <div key={editor.name} className="group flex flex-col items-center p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 hover:border-orange-200 hover:bg-white/90 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="relative h-12 w-12 mb-3 transition-transform group-hover:scale-110">
                  <Image src={editor.logo} alt={`${editor.name} logo`} fill className="object-contain" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.03),transparent)]"></div>
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              Enterprise-grade AI infrastructure,<br />
              <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">developer-first experience</span>
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Built for teams who need reliable, auditable, and cost-effective AI integration
            </p>
          </div>
          <div className="grid gap-12 lg:grid-cols-3">
            {BENEFITS.map((benefit, index) => (
              <div key={benefit.title} className="group text-center p-8 rounded-2xl bg-gradient-to-br from-white to-orange-50/30 border border-orange-100/50 hover:border-orange-200 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex justify-center mb-6 group-hover:scale-110 transition-transform duration-300">{benefit.icon}</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-orange-700 transition-colors">{benefit.title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Models */}
      <section className="py-24 bg-gradient-to-br from-violet-50 via-white to-orange-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              State-of-the-art models,<br />
              <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">zero configuration</span>
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Access frontier models the moment they're released. No API setup, no rate limits.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {TOP_MODELS.map((model) => (
              <div key={model.name} className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 hover:border-orange-200 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/10">
                {model.badge && (
                  <span className={`absolute -top-2 -right-2 px-3 py-1 text-xs font-bold rounded-full ${
                    model.badge === 'NEW' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-lg' :
                    model.badge === 'POPULAR' ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg' :
                    'bg-gradient-to-r from-violet-400 to-violet-500 text-white shadow-lg'
                  }`}>
                    {model.badge}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-12 w-12 p-2 rounded-xl bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Image src={model.logo} alt={`${model.provider} logo`} fill className="object-contain" />
                  </div>
                  <span className="text-sm font-medium text-slate-500 group-hover:text-orange-600 transition-colors">{model.provider}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-700 transition-colors">{model.name}</h3>
                <p className="text-slate-600">{model.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-white to-violet-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              Get started in<br />
              <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">under 2 minutes</span>
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              No API setup required. Works with your existing editor and tools.
            </p>
          </div>
          <div className="grid gap-12 lg:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.step} className="group text-center relative">
                <div className="mx-auto w-16 h-16 bg-white border-4 border-orange-200 rounded-xl flex items-center justify-center text-orange-600 font-bold text-lg mb-8 group-hover:border-orange-400 group-hover:bg-orange-50 transition-all duration-300">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-orange-700 transition-colors">{step.title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed">{step.description}</p>
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-12 h-0.5 bg-gradient-to-r from-orange-200 to-orange-300"></div>
                )}
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
