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

const mcpClients = [
  { name: 'Cursor', src: 'https://cdn.freelogovectors.net/wp-content/uploads/2025/06/cursor-logo-freelogovectors.net_.png' },
  { name: 'Claude Code', src: 'https://sajalsharma.com/_astro/claude_code.GbHphWWe_Z29KFWg.webp.jpg' },
  { name: 'Codex CLI', src: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/openai-icon.png' },
  { name: 'Continue', src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIHtPAJsmkLkem2H02zTflsqpNC-V6kwIcEQ&s' },
  { name: 'Cline', src: 'https://cline.bot/assets/branding/logos/cline-wordmark-black.svg' },
  { name: 'Kilocode', src: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZjLYpi_nnWwjHtQ9xoAzk1KVHXoqehPRE3Q&s' },
  { name: 'Roo Code', src: 'https://pirago.vn/wp-content/uploads/2025/07/roo-code.webp' },
  { name: 'Zed', src: 'https://zed.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_icon.d67dc948.webp&w=750&q=100' },
  { name: 'OpenCode', src: 'https://pbs.twimg.com/profile_images/1965545550855720960/Jl7BzTSD_400x400.jpg' },
  { name: 'Gemini CLI', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' }
]

const latestModels = [
  { name: 'GPT-5', provider: 'OpenAI', src: 'https://models.dev/logos/openai.svg' },
  { name: 'Claude Opus 4', provider: 'Anthropic', src: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Gemini 2.5 Pro', provider: 'Google', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'Grok 4 High', provider: 'xAI', src: 'https://models.dev/logos/xai.svg' }
]

const routing = [
  {
    title: '1. Local CLIs first',
    body: 'If Codex, Claude Code, or Gemini CLI are logged in, we send the prompt there instantly. Zero extra spend.'
  },
  {
    title: '2. Your API keys second',
    body: 'Encrypted OpenAI, Anthropic, Google, Groq, DeepSeek and more. Budgets and defaults live in the dashboard.'
  },
  {
    title: '3. Polydev credits when you say so',
    body: 'Our OpenRouter account backs you up when travel laptops or new teammates have nothing configured.'
  }
]

const steps = [
  { title: 'Call Polydev mid-chat', text: 'Same editor, same thread. No new window. No copy paste.' },
  { title: 'We attach the right context', text: 'Pick the folders once. Everything travels out encrypted and only when needed.' },
  { title: 'Multiple brains reply together', text: 'GPT-5, Opus 4, Gemini 2.5 Pro, Grok 4 High and whoever else you trust stream back side by side.' },
  { title: 'You pick the best take', text: 'Drop it into the file, ask a follow up, or forward it to another agent. Flow stays unbroken.' }
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  return (
    <div className="min-h-screen bg-[#06080f] text-slate-100">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),rgba(6,8,15,0.95))]">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-24 pt-28 text-left lg:px-0">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
              No context switching · MCP native · Live inside your editor
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Cursor froze? Claude rambled? Polydev blasts GPT-5, Opus 4, Gemini 2.5 Pro, Grok 4 High into the same chat before the silence gets weird.
            </h1>
            <p className="text-lg text-white/80">
              Hit one key. Polydev fans out to every model you care about and streams the raw answers right where you are.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-slate-900/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Open dashboard' : 'Add Polydev to my editor'}
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
            >
              Watch the 90 second tour
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
              <div className="text-3xl font-semibold text-white">{modelStats.totalModels}+</div>
              <div className="mt-1 text-sm text-white/70">Models wired up</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
              <div className="text-3xl font-semibold text-white">{modelStats.totalProviders}+</div>
              <div className="mt-1 text-sm text-white/70">Providers out of the box</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
              <div className="text-3xl font-semibold text-white">1.7 s</div>
              <div className="mt-1 text-sm text-white/70">Median answer latency</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-[#090c16]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6 px-6 py-12">
          {mcpClients.map((client) => (
            <div key={client.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src={client.src} alt={`${client.name} logo`} fill sizes="32px" className="object-contain" />
              </div>
              <span className="text-sm font-medium text-white/85">{client.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#06080f] py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-0">
          <h2 className="text-3xl font-semibold sm:text-4xl">The models that matter answer together.</h2>
          <p className="mt-3 text-lg text-white/70">We keep the newest releases ready. No more chasing API docs.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {latestModels.map((model) => (
              <div key={model.name} className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8">
                    <Image src={model.src} alt={`${model.provider} logo`} fill sizes="32px" className="object-contain" />
                  </div>
                  <div className="text-sm text-white/80">{model.provider}</div>
                </div>
                <div className="mt-4 text-lg font-semibold text-white">{model.name}</div>
                <p className="mt-2 text-sm text-white/60">Ready to stream side by side with everything else.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#090c16] py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-0">
          <h2 className="text-3xl font-semibold sm:text-4xl">Routing order that keeps spend under control.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {routing.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/8 p-7 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-white/70">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#06080f] py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-0">
          <h2 className="text-3xl font-semibold sm:text-4xl">Four beats from stuck to shipped.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.title} className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur">
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-white/70">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-[#05070e] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Give your editor a panic button.</h2>
          <p className="mt-4 text-lg text-white/75">100 free runs on day one. Unlimited for 20 dollars a month when you are ready. Hosted MCP, local bridge, and dashboards included.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Back to dashboard' : 'Create workspace'}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
