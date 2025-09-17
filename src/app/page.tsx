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

const providerLogos = [
  { name: 'OpenAI', src: 'https://models.dev/logos/openai.svg' },
  { name: 'Anthropic', src: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Google', src: 'https://models.dev/logos/google.svg' },
  { name: 'DeepSeek', src: 'https://models.dev/logos/deepseek.svg' },
  { name: 'Groq', src: 'https://models.dev/logos/groq.svg' },
  { name: 'Mistral', src: 'https://models.dev/logos/mistral.svg' }
]

const clientBadges = [
  {
    name: 'Cursor',
    accent: 'from-[#1d63ff] to-[#051937]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M5 2l14 10-6.2 1.6L14 22l-3.8-5.9L5 19z" />
      </svg>
    )
  },
  {
    name: 'Claude Desktop',
    accent: 'from-[#ff6f00] to-[#1f2937]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="2" fill="none">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 5v7l4 2" />
      </svg>
    )
  },
  {
    name: 'Continue',
    accent: 'from-[#6366f1] to-[#0f172a]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M4 5h6l3 7-3 7H4l3-7zM14 5h6l-3 7 3 7h-6l-3-7z" />
      </svg>
    )
  },
  {
    name: 'Cline',
    accent: 'from-[#22d3ee] to-[#094067]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z" />
      </svg>
    )
  },
  {
    name: 'Gemini CLI',
    accent: 'from-[#00c6ff] to-[#0072ff]',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 2a7 7 0 00-5 12 7 7 0 1010 5 7 7 0 00-5-17z" />
      </svg>
    )
  }
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  const quickStats = [
    { label: 'Models ready to ping', value: `${modelStats.totalModels}+` },
    { label: 'Providers in the mix', value: `${modelStats.totalProviders}+` },
    { label: 'Median round-trip', value: '1.7s' }
  ]

  const reasons = [
    {
      title: 'More takes, zero tab hunting',
      body: 'Cursor stalls? Polydev fires GPT-4, Claude, Gemini, DeepSeek, and whoever else you trust. Everything streams back into the same chat.'
    },
    {
      title: 'Stays in your lane',
      body: 'Keep your CLI auth, keep your API keys, or lean on Polydev credits only when you want. No surprise invoices, no rewiring.'
    },
    {
      title: 'Ships with your context',
      body: 'Point Polydev at your repo and it encrypts the right snippets before they leave your machine. You decide what memory gets synced.'
    }
  ]

  const ladder = [
    {
      tag: 'First try',
      title: 'Local CLIs',
      body: 'If Codex, Claude Code, or Gemini CLI are logged in, Polydev routes the ask there instantly. Free, fast, familiar.'
    },
    {
      tag: 'Then',
      title: 'Your API keys',
      body: 'Encrypted keys for OpenAI, Anthropic, Google and friends. You see the tokens and dollars for every call.'
    },
    {
      tag: 'Safety net',
      title: 'Polydev credits',
      body: 'Our OpenRouter pool catches everything else. Great when you are traveling or onboarding a teammate who has no keys yet.'
    }
  ]

  const steps = [
    {
      label: 'Ping Polydev',
      text: 'Your agent hits a wall. Send the exact same message to Polydev without leaving the editor.'
    },
    {
      label: 'We add the missing context',
      text: 'Relevant repo notes, TODOs, or previous chats get encrypted and appended automatically.'
    },
    {
      label: 'Parallel replies land',
      text: 'Multiple models talk back at once. Watch their reasoning instead of waiting for retries.'
    },
    {
      label: 'Pick the answer, keep moving',
      text: 'Drop in the best idea, reply again, or hand it to another model. Flow stays unbroken.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#050817] text-slate-100">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-56 left-1/2 h-[42rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),rgba(15,23,42,0))] blur-3xl" />
          <div className="absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(99,102,241,0.35),rgba(15,23,42,0))] blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-28 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200/80 backdrop-blur">
              Works with your editor • No new window • MCP native
            </span>
            <h1 className="mt-8 text-4xl font-semibold leading-tight sm:text-5xl">
              Stop letting Cursor spiral. Polydev drags in backup brains the second your tool shrugs.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-200/85">
              One MCP server that beams prompts to {modelStats.totalProviders}+ providers and {modelStats.totalModels}+ models while you stay inside Cursor, Claude Desktop, Continue, Cline, or Gemini CLI. No context juggling. No guesswork.
            </p>

            <div className="mt-8 flex flex-col gap-3 text-sm text-slate-200/70">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Keep your workflow-Polydev feels like an extra tab in the same chat.
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
                See raw answers, token counts, and who paid for them every time.
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth'}
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-900/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {isAuthenticated ? 'Open dashboard' : 'Add Polydev free'}
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
              >
                Watch the 2 min walkthrough
              </Link>
            </div>
          </div>

          <div className="grid max-w-md gap-4 sm:grid-cols-2 lg:w-auto">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                <div className="text-3xl font-semibold text-white">{stat.value}</div>
                <div className="mt-2 text-sm text-slate-200/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#090d24]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 px-6 py-8">
          {clientBadges.map((client) => (
            <div
              key={client.name}
              className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r ${client.accent} px-4 py-2 text-sm font-medium text-white/90 shadow-sm`}
            >
              <span className="text-white/80">{client.icon}</span>
              {client.name}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#050817] py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <h2 className="text-3xl font-semibold sm:text-4xl">What Polydev gives you on day one.</h2>
          <p className="mt-3 text-lg text-slate-200/80">Short, sweet, and built to keep you in flow.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {reasons.map((reason) => (
              <div key={reason.title} className="rounded-3xl border border-white/5 bg-white/5 p-7 shadow-sm">
                <h3 className="text-xl font-semibold text-white">{reason.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-200/85">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#090d24] py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">How we keep costs honest.</h2>
            <p className="mt-3 text-lg text-slate-200/80">Polydev always tries the cheapest lane first. Flip the switches if you want, but the ladder below just works.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {ladder.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/5 bg-white/5 p-7">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300/70">{item.tag}</span>
                <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-200/85">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#050817] py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[3fr,2fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold sm:text-4xl">{modelStats.totalModels}+ models in your pocket thanks to models.dev.</h2>
              <p className="mt-3 text-lg text-slate-200/80">
                Polydev syncs provider catalogs, pricing, context limits, and capability flags from models.dev so you do not have to chase changelogs.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-200/75">
                <li>• `providers_registry`, `models_registry`, and `model_mappings` stay fresh automatically.</li>
                <li>• Usage logs record latency, token counts, and routing path for every request.</li>
                <li>• Need a custom report? Use the Supabase MCP server instead of hand-rolled SQL.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm font-semibold text-slate-200/80">Model logos you can hit today</p>
              <div className="mt-5 grid grid-cols-3 gap-6">
                {providerLogos.map((logo) => (
                  <div key={logo.name} className="flex flex-col items-center gap-2 text-xs text-slate-200/70">
                    <div className="relative h-10 w-10">
                      <Image src={logo.src} alt={`${logo.name} logo`} fill className="object-contain" />
                    </div>
                    {logo.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#090d24] py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="max-w-3xl text-center mx-auto">
            <h2 className="text-3xl font-semibold sm:text-4xl">Four quick beats from stuck to shipped.</h2>
            <p className="mt-3 text-lg text-slate-200/80">No rituals, just a second opinion that shows up instantly.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.label} className="rounded-3xl border border-white/5 bg-white/5 p-6 text-left">
                <h3 className="text-base font-semibold text-white">{step.label}</h3>
                <p className="mt-3 text-sm text-slate-200/80">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#050817] py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),rgba(5,8,23,0))] blur-3xl" />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Give your editor a panic button.</h2>
          <p className="mt-3 text-lg text-slate-200/80">
            Start with 100 free runs. Upgrade to unlimited for $20 per month when you feel the lift. Hosted MCP, local bridge, and dashboards are part of the bundle.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-900/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Return to dashboard' : 'Create workspace'}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
