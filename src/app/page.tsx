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

const CLIENT_LOGOS = [
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

const LATEST_MODELS = [
  { name: 'GPT-5', provider: 'OpenAI', src: 'https://models.dev/logos/openai.svg' },
  { name: 'Claude Opus 4', provider: 'Anthropic', src: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Gemini 2.5 Pro', provider: 'Google', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'Grok 4 High', provider: 'xAI', src: 'https://models.dev/logos/xai.svg' }
]

const WHY_POLYDEV = [
  {
    title: 'Stay in one window',
    copy: 'Trigger Polydev from the same Cursor or Cline chat. No browser tab. No context paste.'
  },
  {
    title: 'Hear every model',
    copy: 'Polydev fires GPT-5, Opus 4, Gemini 2.5 Pro, Grok 4 High and your other picks at once. Responses stream raw.'
  },
  {
    title: 'Spend on your terms',
    copy: 'We try local CLIs first, then your API keys, then Polydev credits. Every run shows who paid.'
  }
]

const ROUTING = [
  {
    title: '1. Prefer your CLIs',
    copy: 'If Codex, Claude Code, or Gemini CLI are logged in, Polydev uses them instantly and for free.'
  },
  {
    title: '2. Fall back to your keys',
    copy: 'Encrypted OpenAI, Anthropic, Google, Groq, DeepSeek and more. Budgets and defaults live in the dashboard.'
  },
  {
    title: '3. Safety net credits',
    copy: 'Flip on Polydev credits when teammates have nothing set up or you are on a fresh machine.'
  }
]

const FLOW = [
  { title: 'Ping Polydev mid chat', copy: 'One slash command from the editor. Same thread.' },
  { title: 'We attach context', copy: 'Pick the folders once. Everything travels out encrypted when needed.' },
  { title: 'Parallel replies land', copy: 'GPT-5, Opus 4, Gemini 2.5 Pro, Grok 4 High respond together with token + cost stats.' },
  { title: 'You pick the winner', copy: 'Drop in the answer, ask follow-ups, or hand it to another model. Momentum stays high.' }
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  return (
    <div className="min-h-screen bg-[#04060d] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),rgba(4,6,13,0.95))]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-6 pb-24 pt-28">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
              No context switching · MCP native · Lives in your editor
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Cursor stalled? Claude wandered? Polydev blasts GPT-5, Opus 4, Gemini 2.5 Pro, Grok 4 High back into the same chat.
            </h1>
            <p className="text-lg text-white/75">
              One command fans out to every model you trust and streams the raw answers right where you are typing.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-slate-900/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Open dashboard' : 'Plug Polydev into my editor'}
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-3 text-base font-semibold text-white transition duration-200 hover:bg-white/10"
            >
              Watch the quick tour
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
              <div className="text-3xl font-semibold text-white">{modelStats.totalModels}+</div>
              <div className="mt-1 text-sm text-white/70">Models wired in</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
              <div className="text-3xl font-semibold text-white">{modelStats.totalProviders}+</div>
              <div className="mt-1 text-sm text-white/70">Providers ready</div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
              <div className="text-3xl font-semibold text-white">1.7 s</div>
              <div className="mt-1 text-sm text-white/70">Median response</div>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Logos */}
      <section className="border-b border-white/10 bg-[#090c16]">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-4 px-6 py-12 sm:grid-cols-3 lg:grid-cols-5">
          {CLIENT_LOGOS.map((client) => (
            <div key={client.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src={client.src} alt={`${client.name} logo`} fill sizes="32px" className="object-contain" />
              </div>
              <span className="text-sm font-medium text-white/80">{client.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Why Polydev */}
      <section className="bg-[#04060d] py-18">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">Why Polydev</h2>
          <p className="mt-3 text-lg text-white/70">Short reasons from actual builders.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {WHY_POLYDEV.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/8 p-7 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-white/70">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest models */}
      <section className="border-y border-white/10 bg-[#090c16] py-18">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">The new releases are already inside.</h2>
          <p className="mt-3 text-lg text-white/70">No more chasing docs. Just pick the model and send.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LATEST_MODELS.map((model) => (
              <div key={model.name} className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8">
                    <Image src={model.src} alt={`${model.provider} logo`} fill sizes="32px" className="object-contain" />
                  </div>
                  <span className="text-sm text-white/75">{model.provider}</span>
                </div>
                <div className="mt-4 text-lg font-semibold text-white">{model.name}</div>
                <p className="mt-2 text-sm text-white/65">Streams side by side with your other picks.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Routing */}
      <section className="bg-[#04060d] py-18">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">Routing order that keeps spend sane.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {ROUTING.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/8 p-7 backdrop-blur">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm text-white/70">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="border-t border-white/10 bg-[#090c16] py-18">
        <div className="mx-auto max-w-[1100px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">Four beats from stuck to shipped.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {FLOW.map((step) => (
              <div key={step.title} className="rounded-3xl border border-white/10 bg-white/8 p-6 backdrop-blur">
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-white/70">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-[#04060d] py-24">
        <div className="mx-auto max-w-[600px] px-6 text-center">
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
