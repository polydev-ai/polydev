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

const clientLogos = [
  { name: 'Cursor', src: '/logos/cursor.svg' },
  { name: 'Claude Code', src: '/logos/claude-code.svg' },
  { name: 'Codex CLI', src: '/logos/codex.svg' },
  { name: 'Continue', src: '/logos/continue.svg' },
  { name: 'Cline', src: '/logos/cline.svg' },
  { name: 'Gemini CLI', src: '/logos/gemini.svg' }
]

const reasons = [
  {
    title: 'You keep your flow',
    body: 'Stay in Cursor, Claude Desktop, Continue, or Cline. Polydev listens in and fires the same prompt everywhere else for you.'
  },
  {
    title: 'Real answers, no shrugging',
    body: 'Watch GPT-4, Claude, Gemini, DeepSeek, Groq and more talk back in parallel. Compare their takes without leaving the chat.'
  },
  {
    title: 'Spend what you want',
    body: 'Polydev prefers your CLIs first, then your API keys, then credits you control. Every run shows tokens and cost.'
  }
]

const ladder = [
  {
    title: '1. Hit the CLIs you already pay for',
    body: 'Codex CLI, Claude Code, Gemini CLI—if they are logged in locally, they answer first for free.'
  },
  {
    title: '2. Fall back to your API keys',
    body: 'Encrypted OpenAI, Anthropic, Google, Groq, DeepSeek or anything else. Budgets and preferred models live in the dashboard.'
  },
  {
    title: '3. Safety net with Polydev credits',
    body: 'We tap our OpenRouter pool only when you flip the switch. Perfect for teammates who do not have keys yet.'
  }
]

const steps = [
  {
    label: 'Ping Polydev when you are stuck',
    body: 'Same prompt, same editor. No browser tabs, no copy paste.'
  },
  {
    label: 'Polydev grabs the right context',
    body: 'Project memory stays encrypted on the way out. You decide what folders sync.'
  },
  {
    label: 'Multiple models reply at once',
    body: 'See the stream from GPT-4, Claude 3.5, Gemini and friends at the same time.'
  },
  {
    label: 'Drop in the best idea and keep shipping',
    body: 'Pick the answer, ask a follow-up, or hand it to a different model. Momentum stays high.'
  }
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  const statBar = [
    { label: 'Models ready', value: `${modelStats.totalModels}+` },
    { label: 'Providers wired up', value: `${modelStats.totalProviders}+` },
    { label: 'Median round trip', value: '1.7s' }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top,_#dbeafe,_#ffffff_55%)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-28 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              MCP native • Works inside your editor • No new UI to learn
            </span>
            <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              When Cursor blanks or Claude shrugs, Polydev ships backup brains straight into the same window.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Fire the same prompt at GPT-4, Claude 3.5, Gemini, DeepSeek, Groq and more without touching another app. Polydev is the MCP sidekick that keeps your session moving.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth'}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {isAuthenticated ? 'Open dashboard' : 'Connect Polydev' }
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-8 py-3 text-base font-semibold text-slate-800 transition duration-200 hover:bg-slate-100"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="grid max-w-md gap-4 sm:grid-cols-2 lg:w-auto">
            {statBar.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-3xl font-semibold text-slate-900">{stat.value}</div>
                <div className="mt-2 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 py-10">
          {clientLogos.map((logo) => (
            <div key={logo.name} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <div className="relative h-8 w-8">
                <Image src={logo.src} alt={`${logo.name} logo`} fill sizes="32px" className="object-contain" />
              </div>
              <span className="text-sm font-medium text-slate-700">{logo.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reasons */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold sm:text-4xl">Why Polydev exists.</h2>
            <p className="text-lg text-slate-600">Because hitting retry in the same tool over and over gets you nowhere.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {reasons.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ladder */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold sm:text-4xl">How Polydev pays the bills.</h2>
            <p className="text-lg text-slate-600">We always try the cheapest lane before spending your credits.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ladder.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models.dev */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[3fr,2fr] lg:items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold sm:text-4xl">{modelStats.totalModels}+ models on tap thanks to models.dev.</h2>
              <p className="text-lg text-slate-600">
                Polydev syncs model names, pricing, context limits, and capabilities so you do not have to babysit spreadsheets.
              </p>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>• `providers_registry`, `models_registry`, and `model_mappings` stay fresh on their own.</li>
                <li>• Usage logs include latency, tokens, and which path (CLI, key, credit) paid for the run.</li>
                <li>• Need numbers? Hit the Supabase MCP server with `execute_sql` instead of running loose SQL files.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">Typical telemetry</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>claude-3.5-sonnet</span>
                  <span className="text-slate-500">1.3s · CLI</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>gpt-4o</span>
                  <span className="text-slate-500">1.9s · API key</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span>deepseek-r1</span>
                  <span className="text-slate-500">2.1s · Polydev credit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold sm:text-4xl">Four short beats from stuck to shipped.</h2>
            <p className="text-lg text-slate-600">No rituals, just a quick safety valve when your tool goes blank.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">{step.label}</h3>
                <p className="mt-3 text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Give your coding agent a panic button.</h2>
          <p className="mt-4 text-lg text-slate-600">
            100 free runs to see how it feels. Unlimited for $20 a month when you are ready. Hosted MCP, local bridge, and dashboards are included.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Return to dashboard' : 'Create workspace'}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-8 py-3 text-base font-semibold text-slate-800 transition duration-200 hover:bg-slate-100"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
