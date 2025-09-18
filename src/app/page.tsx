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
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top,_#e8f0ff,_#ffffff_55%)]">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-10 px-6 pb-24 pt-28">
          <div className="space-y-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              MCP native / stays inside your editor / no tab juggling
            </span>
            <h1 className="text-4xl font-semibold leading-snug tracking-tight sm:text-5xl">
              Stuck in Cursor or Claude? Polydev sends GPT-5, Claude Opus 4, Gemini 2.5 Pro, and Grok 4 High back into the same thread.
            </h1>
            <p className="text-lg text-slate-600">
              One slash command fans out to the newest models and streams every response where you already work. No new UI, no copy/paste.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-3 text-base font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Open dashboard' : 'Add Polydev to my editor'}
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-7 py-3 text-base font-semibold text-slate-800 transition duration-200 hover:bg-slate-100"
            >
              See how it works
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-3xl font-semibold text-slate-900">{modelStats.totalModels}+</div>
              <div className="mt-1 text-sm text-slate-500">Models plugged in</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-3xl font-semibold text-slate-900">{modelStats.totalProviders}+</div>
              <div className="mt-1 text-sm text-slate-500">Providers supported</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-3xl font-semibold text-slate-900">1.7 s</div>
              <div className="mt-1 text-sm text-slate-500">Median response time</div>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Logos */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-[1080px] grid-cols-2 gap-4 px-6 py-12 sm:grid-cols-3 lg:grid-cols-5">
          {CLIENT_LOGOS.map((client) => (
            <div key={client.name} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                <Image src={client.src} alt={`${client.name} logo`} fill sizes="32px" className="object-contain" />
              </div>
              <span className="text-sm font-medium text-slate-700">{client.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Why Polydev */}
      <section className="bg-white py-18">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">Why teams plug in Polydev</h2>
          <p className="mt-3 text-lg text-slate-600">Three simple reasons from day-one users.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {WHY_POLYDEV.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest models */}
      <section className="border-y border-slate-200 bg-[#f7f9ff] py-18">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">Latest models on tap</h2>
          <p className="mt-3 text-lg text-slate-600">We keep the flagship releases ready so you do not chase docs.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LATEST_MODELS.map((model) => (
              <div key={model.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8">
                    <Image src={model.src} alt={`${model.provider} logo`} fill sizes="32px" className="object-contain" />
                  </div>
                  <span className="text-sm text-slate-600">{model.provider}</span>
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-900">{model.name}</div>
                <p className="mt-2 text-sm text-slate-600">Streams side by side with the rest of your lineup.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Routing */}
      <section className="bg-white py-18">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">How Polydev routes a request</h2>
          <p className="mt-3 text-lg text-slate-600">Fast first, cheap second, safety third.</p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {ROUTING.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="border-t border-slate-200 bg-[#f7f9ff] py-18">
        <div className="mx-auto w-full max-w-[1080px] px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">How it feels in the editor</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {FLOW.map((step) => (
              <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-white py-24">
        <div className="mx-auto flex w-full max-w-[580px] flex-col items-center gap-6 px-6 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Give your editor a safety net.</h2>
          <p className="text-lg text-slate-600">100 free runs on day one. Unlimited for 20 dollars a month when you are ready. Hosted MCP, local bridge, and dashboards included.</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isAuthenticated ? 'Back to dashboard' : 'Create workspace'}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-8 py-3 text-base font-semibold text-slate-800 transition duration-200 hover:bg-slate-100"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
