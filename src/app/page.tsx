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
  { name: 'Cline', logo: 'https://cline.bot/assets/branding/logos/cline-wordmark-black.svg' },
  { name: 'Zed', logo: 'https://zed.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_icon.d67dc948.webp&w=750&q=100' },
  { name: 'VS Code', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg' }
]

const MODEL_PROVIDERS = [
  { name: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { name: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'xAI', logo: 'https://models.dev/logos/xai.svg' }
]

const CODE_EXAMPLES = [
  {
    title: "Debugging Race Conditions",
    language: "TypeScript",
    filename: "queue-processor.ts",
    problem: "// Race condition in async queue processing",
    code: `async function processQueue() {
  const items = await getQueueItems()
  for (const item of items) {
    await processItem(item) // ⚠️ Sequential processing
  }
}`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "The sequential processing here creates unnecessary bottlenecks. Use Promise.all() with batching for concurrent processing while controlling concurrency limits.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "I see the race condition risk. Implement a semaphore pattern with configurable concurrency to prevent overwhelming downstream services.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Add proper error handling and use a task queue library like Bull or Agenda for robust distributed processing with retry logic.",
        typing: true
      }
    ]
  },
  {
    title: "API Architecture Review",
    language: "JavaScript",
    filename: "api-routes.js",
    problem: "// Designing scalable REST endpoints",
    code: `// Should this be RESTful or GraphQL?
app.post('/api/users/:id/posts', async (req, res) => {
  const post = await createUserPost(req.params.id, req.body)
  res.json(post) // Missing validation & error handling
})`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "REST is appropriate here. Add input validation, rate limiting, and proper HTTP status codes. Version your API (/v1/) from the start.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Consider using PATCH for partial updates and implement proper error middleware. Add OpenAPI docs and request/response schemas.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Implement caching headers, add pagination for list endpoints, and consider using GraphQL if you need flexible data fetching.",
        typing: true
      }
    ]
  },
  {
    title: "React Performance Issues",
    language: "React",
    filename: "UserList.tsx",
    problem: "// Component re-renders causing performance issues",
    code: `function UserList({ users, filters }) {
  const filteredUsers = users.filter(user =>
    user.name.includes(filters.search) // Re-computed every render
  )
  return <div>{filteredUsers.map(renderUser)}</div>
}`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Use useMemo to memoize the filtered results and React.memo to prevent unnecessary re-renders. Move the filter logic to a custom hook.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Implement virtualization for large lists using react-window. Debounce the search input and consider server-side filtering for huge datasets.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Add React.memo wrapper, use useCallback for event handlers, and implement incremental loading with Intersection Observer for better UX.",
        typing: true
      }
    ]
  }
]

function TypewriterText({ text, delay = 30, onComplete }: { text: string; delay?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, delay)
      return () => clearTimeout(timeout)
    } else if (onComplete) {
      onComplete()
    }
  }, [currentIndex, text, delay, onComplete])

  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text])

  return <span>{displayedText}<span className="animate-pulse">|</span></span>
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })
  const [currentExample, setCurrentExample] = useState(0)
  const [typingStates, setTypingStates] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    fetchModelsDevStats().then(setModelStats)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => {
        const next = (prev + 1) % CODE_EXAMPLES.length
        setTypingStates({}) // Reset typing states when changing examples
        return next
      })
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  const handleTypingComplete = (responseIndex: number) => {
    setTypingStates(prev => ({ ...prev, [responseIndex]: true }))
  }

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
                    {MODEL_PROVIDERS.map((provider) => (
                      <div key={provider.name} className="w-6 h-6 relative">
                        <Image src={provider.logo} alt={provider.name} fill className="object-contain" />
                      </div>
                    ))}
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

      {/* Dynamic Code Examples */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.03),transparent)]"></div>
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">
              See multi-model AI in action
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Real debugging scenarios, multiple perspectives, better solutions
            </p>
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-orange-100/50">
              {/* Editor header */}
              <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 border-b border-slate-200/50">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="ml-4 text-sm text-slate-600 font-mono flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-orange-400 rounded-full"></span>
                  {CODE_EXAMPLES[currentExample].filename}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">{CODE_EXAMPLES[currentExample].language}</span>
                  <div className="flex gap-1">
                    {CODE_EXAMPLES.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentExample ? 'bg-orange-500 w-6' : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Code block */}
                <div className="mb-8">
                  <div className="text-sm text-slate-500 mb-3 font-mono">{CODE_EXAMPLES[currentExample].problem}</div>
                  <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm overflow-x-auto">
                    <pre className="text-slate-100">
                      <code>{CODE_EXAMPLES[currentExample].code}</code>
                    </pre>
                  </div>
                </div>

                {/* AI Responses */}
                <div className="space-y-4">
                  {CODE_EXAMPLES[currentExample].responses.map((response, index) => (
                    <div key={index} className="group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 p-1.5 group-hover:shadow-lg transition-shadow">
                          <Image src={response.avatar} alt={response.model} width={20} height={20} className="object-contain" />
                        </div>
                        <span className="font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">{response.model}</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50/50 to-violet-50/50 rounded-xl p-4 border border-orange-100/50 group-hover:border-orange-200/50 transition-all">
                        <div className="text-slate-700 leading-relaxed">
                          <TypewriterText
                            text={response.text}
                            delay={25}
                            onComplete={() => handleTypingComplete(index)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                <span className="text-sm font-medium text-slate-700 group-hover:text-orange-600 transition-colors">{editor.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-slate-600 mb-12">
            100 free runs to start. Unlimited for $20 a month when you are ready.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-slate-200 hover:border-orange-200 transition-colors">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-slate-900 mb-4">$0</div>
              <p className="text-slate-600 mb-6">Perfect for trying out Polydev</p>
              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">100 requests/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">3 models access</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Community support</span>
                </li>
              </ul>
              <button className="w-full border-2 border-slate-300 text-slate-700 py-3 px-4 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all font-semibold">
                Get Started Free
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-violet-500 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-4">$20</div>
                <p className="text-orange-100 mb-6">For professional developers</p>
                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Unlimited requests</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All {modelStats.totalModels}+ models</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Project memory</span>
                  </li>
                </ul>
                <button className="w-full bg-white text-orange-600 py-3 px-4 rounded-xl hover:bg-orange-50 transition-colors font-semibold shadow-lg">
                  Start Pro Trial
                </button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-slate-500">* No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-white to-violet-50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Give your editor a safety net</h2>
          <p className="mt-6 text-xl text-slate-600">
            Never get blocked by single model limitations again.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth'}
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/25 transition-all duration-300 hover:shadow-orange-500/40 hover:scale-105"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Create Workspace'}
            </Link>
            <Link
              href="/pricing"
              className="group rounded-full border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-slate-700 transition-all duration-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}