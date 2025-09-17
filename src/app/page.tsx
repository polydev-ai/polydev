'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'

const getStatsFromModelsDevAPI = async () => {
  try {
    const response = await fetch('/api/models-dev/providers')
    if (!response.ok) throw new Error('Failed to fetch models.dev stats')
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

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    getStatsFromModelsDevAPI().then(setModelStats)
  }, [])

  const heroStats = [
    { label: 'Models orchestrated', value: `${modelStats.totalModels}+` },
    { label: 'Providers unified', value: `${modelStats.totalProviders}+` },
    { label: 'Agents connected', value: '600+' },
    { label: 'Average response', value: '1.7s' }
  ]

  const pillars = [
    {
      icon: '🧠',
      title: 'Multi-model breakthroughs on tap',
      copy: 'Fan out to GPT-4, Claude 3.5, Gemini, open-source specialists and more-Polydev streams every raw perspective so your agent can decide the best path forward.'
    },
    {
      icon: '⚙️',
      title: 'Drop-in for every MCP client',
      copy: 'One MCP server powers Claude Desktop, Cursor, Continue, VS Code via Cline, and your bespoke agents. Install once, light up every surface.'
    },
    {
      icon: '🔒',
      title: 'Context aware, zero-knowledge safe',
      copy: 'Universal memory extraction keeps project context encrypted end-to-end. Auto-inject the right snippets without ever leaking secrets.'
    }
  ]

  const connectionModes = [
    {
      title: 'Subscription CLIs first',
      subtitle: 'Reuse what you already pay for',
      description:
        'If Codex CLI, Claude Code CLI, or Gemini CLI are installed and authenticated, Polydev routes requests there instantly-no additional spend.',
      accent: 'from-emerald-400 to-teal-500'
    },
    {
      title: 'Then BYO API keys',
      subtitle: 'Full control of quotas',
      description:
        'Upload encrypted OpenAI, Anthropic, Google, or any supported key. Polydev respects your limits and surfaces token + cost telemetry for every call.',
      accent: 'from-sky-400 to-blue-500'
    },
    {
      title: 'Polydev credits last',
      subtitle: 'Managed fallback when you need it',
      description:
        'Tap Polydev\'s enterprise OpenRouter pool only when other paths aren\'t available. Perfect for emergencies or teams who want usage guardrails.',
      accent: 'from-purple-400 to-fuchsia-500'
    }
  ]

  const workflow = [
    {
      step: '01',
      title: 'Your agent stalls on a hard problem',
      detail: 'Send a single MCP call from your editor-no context switching, no copy/paste gymnastics.'
    },
    {
      step: '02',
      title: 'Polydev fans out intelligently',
      detail: 'We auto-inject relevant code memory, prefer local CLIs, fall back gracefully, and stream every model\'s reasoning in parallel.'
    },
    {
      step: '03',
      title: 'You compare raw answers side by side',
      detail: 'No ensembling or hidden judging-Polydev surfaces unfiltered responses with latency, token usage, and pricing metadata.'
    },
    {
      step: '04',
      title: 'Commit with confidence',
      detail: 'Choose the breakthrough response that fits your project best, and keep building without losing momentum.'
    }
  ]

  const testimonials = [
    {
      name: 'Priya Das',
      title: 'Staff Software Engineer · Fintech',
      quote:
        'Polydev turned our VS Code workflow into a multi-model control room. When Claude hesitates, GPT-4 and DeepSeek jump in instantly with alternatives-no one gets stuck waiting anymore.'
    },
    {
      name: 'Miguel Ortega',
      title: 'Founder · Autonomous Agents Startup',
      quote:
        'We ship agents that default to local CLIs, escalate to customer keys, and finally to our Polydev credit pool-all without extra code. It\'s the safety net our customers asked for.'
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-500/30 via-indigo-500/20 to-fuchsia-500/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 translate-x-[-30%] translate-y-[30%] rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-400/20 blur-3xl" />
          <div className="absolute right-8 top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-28 pt-32 sm:px-10 lg:pt-36">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium text-slate-100 backdrop-blur">
              Hosted MCP • OAuth, tokens & CLI auto-detect • models.dev integrated
            </span>
            <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              The multi-model control layer your coding agents were missing.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-200 sm:text-xl">
              Polydev is the MCP server that turns "I\'m stuck" into "Here are five angles." Fan out across {modelStats.totalProviders}+ providers, stream raw answers, and keep ownership of how you pay for compute-CLI subscriptions first, API keys next, Polydev credits only when you need them.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-800/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Open dashboard
                </Link>
              ) : (
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-800/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get started free
                </Link>
              )}

              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
              >
                Explore docs
              </Link>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur"
                >
                  <div className="text-3xl font-semibold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-200/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations banner */}
      <section className="border-b border-slate-200/70 bg-white py-14 dark:border-slate-800/70 dark:bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 sm:gap-12">
          {[
            'Claude Desktop',
            'Cursor',
            'Continue',
            'Cline',
            'Gemini CLI',
            'Custom MCP Agents'
          ].map((client) => (
            <div
              key={client}
              className="flex items-center gap-2 rounded-full border border-slate-200/70 px-4 py-2 text-xs uppercase tracking-wide dark:border-slate-800/70"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {client}
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-slate-50 py-20 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Why builders choose Polydev as the "never get stuck" layer.
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              We designed Polydev so one MCP integration gives you parallel model intelligence, airtight context handling, and cost controls that favour the subscription and keys you already own.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="absolute -top-20 right-[-30%] h-48 w-48 rounded-full bg-gradient-to-br from-sky-400/20 to-fuchsia-400/10 blur-3xl transition group-hover:scale-110" />
                <div className="relative text-2xl">{pillar.icon}</div>
                <h3 className="relative mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="relative mt-4 text-base text-slate-600 dark:text-slate-300">
                  {pillar.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connection ladder */}
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[2fr,3fr] lg:items-center">
            <div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Connection ladder
              </span>
              <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
                Three ways to route a request-Polydev automatically chooses the cheapest, fastest path.
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Keep control of spend without touching your agent code. We start with local CLIs, then encrypted BYO keys, and only use Polydev credits as a safety net.
              </p>
            </div>

            <div className="grid gap-6">
              {connectionModes.map((mode) => (
                <div
                  key={mode.title}
                  className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${mode.accent}`} />
                  <div className="pl-6">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {mode.subtitle}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {mode.title}
                    </h3>
                    <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
                      {mode.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Models.dev + telemetry */}
      <section className="bg-slate-900 py-20 text-slate-100">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                Model atlas
              </span>
              <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
                {modelStats.totalModels}+ models, {modelStats.totalProviders}+ providers. All mapped and priced for you via models.dev.
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                Polydev syncs with models.dev to stay on top of new releases, pricing shifts, context window changes, and capability flags. Build UI selectors, policy checks, or allowlists straight from our registry tables.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li>• `providers_registry`, `models_registry`, and `model_mappings` stay current without manual work.</li>
                <li>• Live usage telemetry exposes tokens, latency, and estimated spend per provider.</li>
                <li>• Surfacing data to your dashboards is a Supabase MCP `execute_sql` call away.</li>
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-sky-400/20 to-purple-400/10 blur-3xl" />
              <h3 className="text-lg font-semibold text-white">Telemetry snapshot</h3>
              <p className="mt-3 text-sm text-slate-200">
                Example from `mcp_request_logs` (all prompts encrypted, metadata visible for observability):
              </p>
              <div className="mt-6 space-y-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-xs uppercase text-slate-400">
                    <span>Model</span>
                    <span>Latency</span>
                    <span>Tokens</span>
                    <span>Path</span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 items-center rounded-xl bg-black/30 px-3 py-2 text-sm">
                    <span>claude-3.5-sonnet</span>
                    <span>1.3s</span>
                    <span>1.8k</span>
                    <span className="text-emerald-400">CLI</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 items-center rounded-xl bg-black/30 px-3 py-2 text-sm">
                    <span>gpt-4o</span>
                    <span>1.9s</span>
                    <span>1.6k</span>
                    <span className="text-sky-400">API key</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 items-center rounded-xl bg-black/30 px-3 py-2 text-sm">
                    <span>deepseek-r1</span>
                    <span>2.1s</span>
                    <span>1.1k</span>
                    <span className="text-fuchsia-400">Polydev credit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="max-w-3xl text-center mx-auto">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              From stuck to shipped in four deliberate beats.
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Designed for builders who want multi-model leverage without giving up operator control.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {workflow.map((stage) => (
              <div
                key={stage.step}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {stage.step}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                  {stage.title}
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {stage.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-100 py-20 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <h2 className="text-center text-3xl font-semibold sm:text-4xl">
            Teams stay in flow with Polydev
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-200">
                  "{testimonial.quote}"
                </p>
                <div className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {testimonial.name} · {testimonial.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
        <div className="absolute inset-x-0 -top-32 -z-10 h-64 bg-gradient-to-br from-sky-500/20 to-emerald-400/30 blur-3xl" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Ship with a safety net. Connect Polydev once and unblock every agent surface you own.
          </h2>
          <p className="text-lg text-slate-200">
            100 free message sessions to start. Unlimited use for $20/mo when you're ready to scale. Dashboard, hosted MCP, and local bridge are all included.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Return to dashboard' : 'Create your workspace'}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
