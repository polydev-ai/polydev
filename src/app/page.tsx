'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'

const fetchModelsDevStats = async () => {
  try {
    const response = await fetch('/api/models-dev/providers')
    if (!response.ok) throw new Error('Failed to load providers')
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
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  const ecosystem = ['Claude Desktop', 'Cursor', 'Continue', 'Cline', 'Gemini CLI', 'Custom MCP']

  const pillars = [
    {
      title: 'Concert of models without orchestration debt',
      copy: 'Polydev fires GPT-4, Claude 3.5, Gemini, DeepSeek, and dozens more in parallel. Every response streams raw so your agent can compare thinking and ship the best idea.'
    },
    {
      title: 'One MCP install, every surface covered',
      copy: 'Drop the Polydev server into any MCP client or run our hosted endpoint. The same tool works in editors, terminals, and bespoke agent frameworks.'
    },
    {
      title: 'Context that stays in your hands',
      copy: 'Universal memory extraction keeps local files encrypted end to end. Toggle which sources sync, set relevance thresholds, and auto-inject only what matters.'
    }
  ]

  const ladder = [
    {
      label: 'Reuse subscriptions first',
      headline: 'We hit Codex CLI, Claude Code CLI, or Gemini CLI before anything else.',
      detail: 'If a CLI is installed and authenticated, Polydev routes traffic there instantly. No extra spend, no credential juggling.'
    },
    {
      label: 'Respect your API keys next',
      headline: 'Encrypted OpenAI, Anthropic, Google, Groq, or any supported key.',
      detail: 'Keys never leave the browser without encryption. Set per-key budgets, preferred models, and instantly see token + cost telemetry.'
    },
    {
      label: 'Managed credits as a safety net',
      headline: 'Tap Polydev credits backed by our enterprise OpenRouter account only when you choose to.',
      detail: 'Ideal for teams that want guardrails or a last-resort path. Every call is logged with cost, latency, and provider diagnostics.'
    }
  ]

  const workflow = [
    {
      step: '01',
      title: 'Your agent calls Polydev',
      detail: 'One MCP tool invocation from the editor or CLI carries prompt, project signals, and routing preferences.'
    },
    {
      step: '02',
      title: 'Polydev primes context',
      detail: 'Memory extractor pulls relevant snippets, encrypts them, and injects the right pieces into the prompt stack.'
    },
    {
      step: '03',
      title: 'Parallel fan out',
      detail: 'We prioritize local CLIs, fall back to API keys, then to credits. Every upstream request runs concurrently.'
    },
    {
      step: '04',
      title: 'Insights stream back',
      detail: 'Each model response arrives with latency, token usage, and provenance so your agent can pick or blend the best answer.'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-48 left-1/2 h-[38rem] w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sky-500/35 via-indigo-400/25 to-purple-500/25 blur-3xl" />
          <div className="absolute bottom-[-10rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-emerald-400/30 to-sky-400/20 blur-3xl" />
          <div className="absolute top-1/3 left-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-28 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm font-medium text-slate-200/90 backdrop-blur">
              Hosted MCP · OAuth & tokens · CLI auto-detect · models.dev synced
            </span>
            <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              The command center that keeps MCP agents moving.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-200/80">
              Polydev routes every request through the smartest path, injects the right context, and returns raw reasoning from {modelStats.totalProviders}+ providers and {modelStats.totalModels}+ models. When your agent hesitates, Polydev gives it instant new angles.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth'}
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-900/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                {isAuthenticated ? 'Open dashboard' : 'Start free'}
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
              >
                View docs
              </Link>
            </div>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto">
            {[{ label: 'Models orchestrated', value: `${modelStats.totalModels}+` }, { label: 'Providers unified', value: `${modelStats.totalProviders}+` }, { label: 'Average response', value: '1.7s' }, { label: 'Active agent installs', value: '600+' }].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-2xl font-semibold text-white">{stat.value}</div>
                <div className="mt-2 text-sm text-slate-200/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem bar */}
      <section className="border-y border-white/5 bg-slate-900/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 px-6 py-6 text-sm text-slate-300/80">
          {ecosystem.map((client) => (
            <span
              key={client}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 uppercase tracking-wide"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {client}
            </span>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-slate-950 py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-10">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold sm:text-4xl">Why teams run Polydev alongside every MCP surface.</h2>
            <p className="text-lg text-slate-300/80">
              We designed Polydev to give you parallel intelligence, controlled spend, and custody of your own context—all without touching agent code.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                <h3 className="text-xl font-semibold text-white">{pillar.title}</h3>
                <p className="mt-4 text-base text-slate-300/85">{pillar.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Routing ladder */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[2fr,3fr] lg:items-center">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200/80">
                Connection ladder
              </span>
              <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
                Three deliberate steps keep spend low and reliability high.
              </h2>
              <p className="mt-4 text-lg text-slate-300/85">
                Polydev always prefers the cheapest route and fails over gracefully. You can flip preferences per project, but the default keeps ownership with you.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400 via-sky-500 to-purple-500" />
              <div className="space-y-8 pl-10">
                {ladder.map((item, index) => (
                  <div key={item.label} className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="absolute -left-10 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-xs font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">
                      {item.label}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{item.headline}</h3>
                    <p className="mt-3 text-sm text-slate-200/80">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Models.dev + telemetry */}
      <section className="bg-slate-950 py-20">
        <div className="mx-auto max-w-6xl grid gap-12 px-6 lg:grid-cols-[3fr,2fr] lg:items-center lg:px-12">
          <div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200/80">
              Model atlas
            </span>
            <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
              {modelStats.totalModels}+ models mapped, priced, and ready through models.dev.
            </h2>
            <p className="mt-4 text-lg text-slate-300/85">
              Polydev syncs with models.dev on a schedule, so new releases, cost changes, and capability flags land in your dashboard automatically. Build allowlists, pricing controls, and usage analytics straight from our Supabase tables.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300/75">
              <li>`providers_registry`, `models_registry`, and `model_mappings` stay current without manual updates.</li>
              <li>Each request records tokens, latency, response path, and cost in `mcp_request_logs` and `usage_sessions`.</li>
              <li>Need a custom report? Call the Supabase MCP server with `execute_sql` instead of managing SQL files.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="text-sm font-semibold text-slate-200/80">Telemetry snapshot</div>
            <p className="mt-2 text-xs text-slate-300/70">Live sample (content encrypted, metadata visible):</p>
            <div className="mt-5 space-y-3">
              {[
                { model: 'claude-3.5-sonnet', latency: '1.3s', tokens: '1.8k', path: 'CLI' },
                { model: 'gpt-4o', latency: '1.9s', tokens: '1.6k', path: 'API key' },
                { model: 'deepseek-r1', latency: '2.1s', tokens: '1.1k', path: 'Polydev credit' }
              ].map((row) => (
                <div key={row.model} className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between text-white">
                    <span>{row.model}</span>
                    <span className="text-slate-300/80">{row.latency}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-300/70">
                    <span>{row.tokens} tokens</span>
                    <span className={row.path === 'CLI' ? 'text-emerald-300' : row.path === 'API key' ? 'text-sky-300' : 'text-fuchsia-300'}>{row.path}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="max-w-3xl text-center mx-auto space-y-4">
            <h2 className="text-3xl font-semibold sm:text-4xl">From prompt to breakthrough in four deliberate beats.</h2>
            <p className="text-lg text-slate-300/80">
              Polydev keeps your agent in flow without hiding the routing decisions or the data behind them.
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-4">
            {workflow.map((stage) => (
              <div key={stage.step} className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-300/70">{stage.step}</div>
                <h3 className="mt-3 text-lg font-semibold text-white">{stage.title}</h3>
                <p className="mt-3 text-sm text-slate-300/80">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-slate-950 py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sky-500/25 to-transparent blur-3xl" />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Plug in once. Unblock every agent surface you run.</h2>
          <p className="mt-4 text-lg text-slate-300/85">
            Start with 100 free message sessions. Upgrade to unlimited for $20 per month when you are ready. Dashboard, hosted MCP, and local bridge are included.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-950 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Return to dashboard' : 'Create workspace'}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
