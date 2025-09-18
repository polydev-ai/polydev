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

const CODE_EXAMPLES = [
  {
    title: "Debugging Race Conditions",
    problem: "// This async code has a race condition",
    code: `async function processQueue() {
  const items = await getQueueItems()
  for (const item of items) {
    await processItem(item) // Race condition here
  }
}`,
    responses: [
      { model: "Claude", text: "I see the issue - concurrent queue processing can cause race conditions. Use Promise.all() with batch processing.", color: "bg-orange-50 border-orange-200 text-orange-800" },
      { model: "GPT-5", text: "The race condition occurs when multiple items modify shared state. Implement a semaphore pattern to limit concurrency.", color: "bg-green-50 border-green-200 text-green-800" },
      { model: "Gemini", text: "Add proper error handling and use a task queue with configurable concurrency limits for robust processing.", color: "bg-purple-50 border-purple-200 text-purple-800" }
    ]
  },
  {
    title: "API Design Review",
    problem: "// Designing a scalable REST API",
    code: `// Should this be RESTful or GraphQL?
app.post('/api/users/:id/posts', (req, res) => {
  // Create post for user
})`,
    responses: [
      { model: "Claude", text: "For this use case, REST is fine. Consider adding pagination, filtering, and proper status codes. Version your API from day one.", color: "bg-orange-50 border-orange-200 text-orange-800" },
      { model: "GPT-5", text: "REST works here, but add rate limiting, input validation, and consider using PATCH for partial updates instead of PUT.", color: "bg-green-50 border-green-200 text-green-800" },
      { model: "Gemini", text: "Implement proper error responses, add OpenAPI documentation, and consider using HTTP caching headers for performance.", color: "bg-purple-50 border-purple-200 text-purple-800" }
    ]
  },
  {
    title: "Performance Optimization",
    problem: "// This component re-renders too often",
    code: `function UserList({ users, filters }) {
  const filteredUsers = users.filter(user =>
    user.name.includes(filters.search)
  )
  return <div>{/* render users */}</div>
}`,
    responses: [
      { model: "Claude", text: "Use useMemo to memoize the filtered results and useCallback for event handlers to prevent unnecessary re-renders.", color: "bg-orange-50 border-orange-200 text-orange-800" },
      { model: "GPT-5", text: "Implement virtualization for large lists, debounce the search input, and consider moving filter logic to a custom hook.", color: "bg-green-50 border-green-200 text-green-800" },
      { model: "Gemini", text: "Add React.memo wrapper, use a ref for the search input, and consider server-side filtering for large datasets.", color: "bg-purple-50 border-purple-200 text-purple-800" }
    ]
  }
]

function TypewriterText({ text, delay = 50 }: { text: string; delay?: number }) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, delay)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, delay])

  return <span>{displayedText}</span>
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })
  const [currentExample, setCurrentExample] = useState(0)

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % CODE_EXAMPLES.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-white">
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="text-center">
            <div className="mx-auto max-w-4xl">
              {/* Robot Icon + Logo */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="text-6xl">🤖</div>
                <h1 className="text-6xl font-black tracking-tight text-gray-900 font-mono">
                  polydev
                </h1>
              </div>

              <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl mb-6">
                Never get stuck<br />
                <span className="text-emerald-600">coding again</span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                When Claude hits a wall, GPT-5 steps in. When one model misses a bug, others catch it.<br />
                Get multiple AI perspectives on your code, architecture, and debugging — all from your editor.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
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
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-8 text-center">
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

      {/* Dynamic Code Examples */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">See it in action</h2>
            <p className="text-xl text-gray-600">Real debugging scenarios, multiple AI perspectives</p>
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-200">
              <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="ml-4 text-sm text-gray-600 font-mono">{CODE_EXAMPLES[currentExample].title}</div>
                <div className="ml-auto flex gap-1">
                  {CODE_EXAMPLES.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentExample ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <div className="text-sm text-gray-500 mb-2">{CODE_EXAMPLES[currentExample].problem}</div>
                  <pre className="bg-slate-50 p-4 rounded-lg text-sm overflow-x-auto border">
                    <code className="text-slate-800">{CODE_EXAMPLES[currentExample].code}</code>
                  </pre>
                </div>

                <div className="space-y-3">
                  {CODE_EXAMPLES[currentExample].responses.map((response, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${response.color}`}>
                      <div className="font-semibold mb-1">{response.model}</div>
                      <div className="text-sm">
                        <TypewriterText
                          text={response.text}
                          delay={currentExample === 0 ? 30 : 0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get started in under 2 minutes</h2>
            <p className="text-xl text-gray-600">No API keys required. Works with your existing tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-lg mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Install MCP Server</h3>
              <p className="text-gray-600">Add Polydev to Cursor, Claude Code, or Continue. One-click install, automatic setup.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-lg mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ask your question</h3>
              <p className="text-gray-600">Query multiple models simultaneously. Get diverse perspectives on debugging, architecture, and code.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-lg mx-auto mb-4">3</div>
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

      {/* Benefits */}
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
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Design smarter</h3>
              <p className="text-gray-600">Get architecture perspectives from GPT-5, Claude, and Gemini simultaneously. Make better decisions.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Never leave your flow</h3>
              <p className="text-gray-600">No copy-paste, no context switching. Get multiple AI perspectives without breaking your development workflow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-600">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">$0</div>
              <p className="text-gray-600 mb-6">Perfect for trying out Polydev</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  100 requests/month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  3 models access
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Community support
                </li>
              </ul>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:border-gray-400 transition-colors">
                Get Started
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-xl border-2 border-emerald-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-medium">Popular</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">$19</div>
              <p className="text-gray-600 mb-6">For individual developers</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  5,000 requests/month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All models access
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Advanced features
                </li>
              </ul>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-colors">
                Start Free Trial
              </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Team</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">$49</div>
              <p className="text-gray-600 mb-6">For growing teams</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  20,000 requests/month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All models access
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Team management
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Premium support
                </li>
              </ul>
              <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:border-gray-400 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get unstuck?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Start with 100 free requests. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
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