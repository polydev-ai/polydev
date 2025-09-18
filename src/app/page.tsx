'use client'

import React, { useEffect, useState } from 'react'
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
  { name: 'Cline', logo: 'https://cline.bot/assets/branding/logos/cline-wordmark-black.svg' }
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="text-center">
            <div className="mx-auto max-w-4xl">
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl mb-6">
                Never get stuck<br />
                <span className="text-blue-600">coding again</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                When Claude hits a wall, GPT-5 steps in. When one model misses a bug, others catch it.<br />
                Get multiple AI perspectives on your code, architecture, and debugging — all from your editor.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  Install MCP Server
                </Link>
                <Link
                  href="/docs"
                  className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg font-semibold transition-colors duration-200"
                >
                  View Integration Docs
                </Link>
              </div>

              {/* Code Editor Mockup */}
              <div className="relative mx-auto max-w-4xl">
                <div className="bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-800">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="ml-4 text-sm text-gray-400 font-mono">cursor › debugging-session.tsx</div>
                  </div>
                  <div className="p-6 text-sm font-mono">
                    <div className="text-gray-300 mb-4">
                      <span className="text-purple-400">// When Claude gets stuck...</span>
                    </div>
                    <div className="bg-red-900/20 border-l-4 border-red-500 pl-4 py-2 mb-4">
                      <div className="text-red-400 mb-2">🔴 Claude: &quot;I&apos;m not sure about this async race condition&quot;</div>
                    </div>
                    <div className="bg-green-900/20 border-l-4 border-green-500 pl-4 py-2 mb-4">
                      <div className="text-green-400 mb-2">✅ GPT-5: &quot;The issue is in line 23 - use Promise.all() here&quot;</div>
                    </div>
                    <div className="bg-blue-900/20 border-l-4 border-blue-500 pl-4 py-2">
                      <div className="text-blue-400 mb-2">💡 Gemini: &quot;Also add error handling for the timeout case&quot;</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats - OpenRouter style */}
          <div className="mt-16 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-gray-900">{modelStats.totalModels}+</div>
              <div className="mt-1 text-gray-600">Models</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900">47K+</div>
              <div className="mt-1 text-gray-600">Bugs Caught</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-900">2.1s</div>
              <div className="mt-1 text-gray-600">Avg Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - 3 step process like OpenRouter */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get started in under 2 minutes</h2>
            <p className="text-xl text-gray-600">No API keys required. Works with your existing tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Install MCP Server</h3>
              <p className="text-gray-600">Add Polydev to Cursor, Claude Code, or Continue. One-click install, automatic setup.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ask your question</h3>
              <p className="text-gray-600">Query multiple models simultaneously. Get diverse perspectives on debugging, architecture, and code.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Compare responses</h3>
              <p className="text-gray-600">Cross-validate solutions, catch edge cases, and pick the best approach — all without leaving your editor.</p>
            </div>
          </div>

          {/* Supported Editors */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-8">Works with the tools you already use</p>
            <div className="flex justify-center items-center gap-8 flex-wrap">
              {SUPPORTED_EDITORS.map((editor) => (
                <div key={editor.name} className="flex items-center gap-2 text-gray-700">
                  <div className="relative h-6 w-6">
                    <Image src={editor.logo} alt={`${editor.name} logo`} fill className="object-contain" />
                  </div>
                  <span className="font-medium">{editor.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits - Simplified */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">AI safety net for your editor</h2>
            <p className="text-xl text-gray-600">Never get blocked by a single model&apos;s limitations</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Debug faster</h3>
              <p className="text-gray-600">When one model can&apos;t spot the race condition, others will. Cross-validate bugs before they ship.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Design smarter</h3>
              <p className="text-gray-600">Get architecture perspectives from GPT-5, Claude, and Gemini simultaneously. Make better decisions.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Never leave your flow</h3>
              <p className="text-gray-600">No copy-paste, no context switching. Get multiple AI perspectives without breaking your development workflow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get unstuck?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Start with 100 free requests. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Get Started'}
            </Link>
            <Link
              href="/docs"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}