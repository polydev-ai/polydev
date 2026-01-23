'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Code2, Sparkles, Zap, Check, ChevronRight, ChevronDown, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import PolydevLogo from '../components/PolydevLogo'

// Enhanced Typewriter with gradient cursor
function TypewriterText({ texts, delay = 50, pauseDuration = 3000 }: {
  texts: string[]
  delay?: number
  pauseDuration?: number
}) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [charIndex, setCharIndex] = useState(0)

  useEffect(() => {
    const currentText = texts[currentTextIndex]

    if (!isDeleting && charIndex < currentText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentText.slice(0, charIndex + 1))
        setCharIndex(charIndex + 1)
      }, delay)
      return () => clearTimeout(timeout)
    }

    if (!isDeleting && charIndex === currentText.length) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && charIndex > 0) {
      const timeout = setTimeout(() => {
        setDisplayedText(currentText.slice(0, charIndex - 1))
        setCharIndex(charIndex - 1)
      }, delay / 2)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false)
      setCurrentTextIndex((currentTextIndex + 1) % texts.length)
    }
  }, [charIndex, isDeleting, currentTextIndex, texts, delay, pauseDuration])

  return (
    <span className="inline-block min-h-[1.5em]">
      {displayedText}
      <span className="inline-block w-0.5 h-8 bg-gradient-to-b from-blue-500 to-purple-500 ml-1 animate-pulse"></span>
    </span>
  )
}

const PROVIDERS = [
  { name: 'OpenAI', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openai.png' },
  { name: 'Anthropic', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/anthropic.png' },
  { name: 'Google', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/gemini-color.png' },
  { name: 'xAI', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/grok.png' },
  { name: 'Groq', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/groq-color.png' },
  { name: 'OpenRouter', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openrouter.png' }
]

const IDE_TOOLS = [
  { name: 'Claude Code', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png' },
  { name: 'Cursor', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/cursor.png' },
  { name: 'Cline', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/cline.png' },
  { name: 'Windsurf', logo: 'https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/windsurf.png' },
  { name: 'Continue', logo: 'https://cdn.prod.website-files.com/663e06c56841363663ffbbcf/663e1b9fb023f0b622ad3608_log-text.svg' }
]

const PROBLEM_SCENARIOS = [
  "Stuck on a bug?",
  "Architecture decision?",
  "Performance issue?",
  "Security concern?",
  "Code review needed?",
  "Design tradeoffs?"
]

const CODE_EXAMPLES = [
  {
    title: "Production Database Crisis",
    filename: "user-service.ts",
    problem: "// N+1 query killing prod performance",
    code: `async function getUsers() {
  const users = await db.query('SELECT * FROM users')

  for (const user of users) {
    user.posts = await db.query(
      'SELECT * FROM posts WHERE user_id = ?',
      [user.id]
    )
  }

  return users  // 10k users = 10k extra queries!
}`,
    responses: [
      {
        model: "Claude Opus 4.5",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png",
        text: "Critical N+1 issue. Use JOIN or DataLoader to batch queries. Add query monitoring with pg-stats. Reduces 10k queries to 1."
      },
      {
        model: "GPT-5.2",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openai.png",
        text: "Implement eager loading with Prisma or TypeORM. Add Redis caching layer. Use database connection pooling for scale."
      },
      {
        model: "Gemini 3 Pro",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/gemini-color.png",
        text: "Batch with single LEFT JOIN query. Add GraphQL DataLoader pattern. Implement query result caching with 5min TTL."
      },
      {
        model: "Grok 4.1",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/grok.png",
        text: "Use SQL window functions for bulk fetch. Consider materialized views for frequent queries. Add read replicas for scaling."
      }
    ]
  },
  {
    title: "Memory Leak in Production",
    filename: "analytics.js",
    problem: "// Event listeners causing memory leaks",
    code: `class Analytics {
  constructor() {
    this.events = []
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  track(event) {
    this.events.push({ ...event, ts: Date.now() })
    window.addEventListener('beforeunload', () => {
      this.flush()  // Leak: never removed!
    })
  }
}`,
    responses: [
      {
        model: "Claude Opus 4.5",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png",
        text: "Remove event listeners in cleanup. Use WeakMap for event storage. Add memory profiling to catch leaks before deploy."
      },
      {
        model: "GPT-5.2",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openai.png",
        text: "Implement proper lifecycle management. Use AbortController for cleanup. Add heap snapshots to CI/CD pipeline."
      },
      {
        model: "Gemini 3 Pro",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/gemini-color.png",
        text: "Store listener refs for cleanup. Use FinalizationRegistry API. Add automated memory regression tests with Puppeteer."
      },
      {
        model: "Grok 4.1",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/grok.png",
        text: "Apply singleton pattern for listener registration. Use WeakRef for callback storage. Monitor with Performance Observer API."
      }
    ]
  },
  {
    title: "Auth Bypass Vulnerability",
    filename: "middleware.ts",
    problem: "// Critical authentication bypass",
    code: `app.use((req, res, next) => {
  const token = req.headers.authorization

  if (token && token.startsWith('Bearer ')) {
    const user = jwt.decode(token.slice(7))
    req.user = user  // No verification!
    return next()
  }

  res.status(401).json({ error: 'Unauthorized' })
})`,
    responses: [
      {
        model: "Claude Opus 4.5",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/claude-color.png",
        text: "CRITICAL: Use jwt.verify() not decode(). Add secret key validation. Implement token rotation and rate limiting immediately."
      },
      {
        model: "GPT-5.2",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openai.png",
        text: "Replace with verified JWT library. Add Redis session store. Implement refresh tokens with short-lived access tokens."
      },
      {
        model: "Gemini 3 Pro",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/gemini-color.png",
        text: "Use passport.js with proper validation. Add JWKS endpoint verification. Implement distributed session management with TTL."
      },
      {
        model: "Grok 4.1",
        avatar: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/grok.png",
        text: "Add signature verification with RS256. Implement token blacklisting for revocation. Use asymmetric keys for better security."
      }
    ]
  }
]

const FAQ_DATA = [
  {
    question: "How do I trigger multiple perspectives?",
    answer: "Ask your MCP-enabled editor (Claude Code, Cursor, Cline) to get perspectives. Example: 'Can you get multiple perspectives on this?' Your editor calls the Polydev MCP tool with your context."
  },
  {
    question: "What context do models receive?",
    answer: "Models receive the context your MCP client provides - typically your current file, selected code, recent changes, and your question. The amount depends on your editor's MCP implementation."
  },
  {
    question: "Which models are available?",
    answer: "346+ models from 37+ providers including Claude Opus 4.5, GPT-5.2, Gemini 3 Pro, Grok 4.1, DeepSeek, and many more. The full list updates automatically in your dashboard."
  },
  {
    question: "How is this different from ChatGPT/Claude separately?",
    answer: "Polydev works directly in your editor with full project context. Get responses from all models simultaneously with your actual codebase - saving 10-15 minutes per comparison."
  },
  {
    question: "Which editors support Polydev?",
    answer: "Any MCP-compatible editor: Claude Code, Cursor (with MCP plugin), Cline (VS Code), Windsurf, and more. If your editor supports Model Context Protocol, it works."
  },
  {
    question: "How does the credit system work?",
    answer: "1 perspective call = 1 credit. Model tiers: Eco (cheapest), Normal (balanced), Premium (powerful). Your subscription includes monthly credit allowance."
  },
  {
    question: "Can I use my own API keys?",
    answer: "Yes! Add API keys from OpenAI, Anthropic, Google, etc. in dashboard. Polydev uses your keys first before credits. Unlimited access at your own API costs."
  }
]

const FAQItem = ({ question, answer, isOpen, onToggle }: any) => (
  <motion.div
    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
    initial={false}
    animate={{
      borderColor: isOpen ? 'rgb(148 163 184)' : 'rgb(226 232 240)'
    }}
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
    >
      <span className="font-semibold text-slate-900">{question}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="w-5 h-5 text-slate-600" />
      </motion.div>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-6 pb-6 text-slate-600 leading-relaxed">
            {answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
)

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({ models: 346, providers: 37 })
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
  const [openFAQs, setOpenFAQs] = useState<number[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentExample = CODE_EXAMPLES[currentExampleIndex]

  // Manual example navigation instead of auto-rotation (less jarring)

  const toggleFAQ = (index: number) => {
    setOpenFAQs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Research Announcement Banner */}
      <Link
        href="/articles"
        className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-500 text-white py-2.5 px-4 text-center text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <span className="hidden sm:inline">🎉 New Research: </span>
        <span className="font-semibold">74.6% on SWE-bench Verified</span>
        <span className="hidden sm:inline"> — Matching Claude Opus at 62% lower cost</span>
        <span className="ml-2 inline-flex items-center">
          Read more <ArrowRight className="w-3 h-3 ml-1" />
        </span>
      </Link>

      {/* Navigation */}
      <nav className="fixed top-10 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <PolydevLogo size={80} className="text-slate-900" />
              <span className="font-semibold text-2xl -ml-3">Polydev</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/docs" className="text-slate-600 hover:text-slate-900 transition-colors">Docs</Link>
              <Link href="/articles" className="text-slate-600 hover:text-slate-900 transition-colors">Articles</Link>
              <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</Link>
              <Link
                href={user ? '/dashboard' : '/auth'}
                className="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-lg hover:from-slate-800 hover:to-slate-600 transition-all transform hover:scale-105"
              >
                {user ? 'Dashboard' : 'Get Started'}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-slate-200"
            >
              <div className="px-4 py-4 space-y-3">
                <Link
                  href="/docs"
                  className="block px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Docs
                </Link>
                <Link
                  href="/articles"
                  className="block px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Articles
                </Link>
                <Link
                  href="/pricing"
                  className="block px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href={user ? '/dashboard' : '/auth'}
                  className="block px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white text-center rounded-lg font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {user ? 'Dashboard' : 'Get Started'}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section - Tighter, more focused */}
      <section className="relative pt-36 pb-16 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-5 leading-tight">
              <TypewriterText texts={PROBLEM_SCENARIOS} />
              <br />
              <span className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                Get Multiple Perspectives
              </span>
            </h1>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed max-w-2xl mx-auto">
              Query Claude Opus 4.5, GPT-5.2, Gemini 3 Pro, Grok 4.1 and more simultaneously—right from your IDE.
              Different models catch different things. Get unstuck faster.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link
                href="/auth"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
              >
                Start Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                Setup Guide
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Simplified stats - focus on value */}
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
              <span>Works with</span>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                {IDE_TOOLS.map((tool, i) => (
                  <motion.div
                    key={tool.name}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * i }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Image src={tool.logo} alt={tool.name} width={16} height={16} className="rounded" />
                    <span className="text-xs font-medium text-slate-700">{tool.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Provider Logos - smaller */}
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-50">
            {PROVIDERS.map((provider, i) => (
              <motion.div
                key={provider.name}
                className="relative w-6 h-6 grayscale hover:grayscale-0 transition-all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.05 * i }}
                whileHover={{ scale: 1.1, opacity: 1 }}
              >
                <Image src={provider.logo} alt={provider.name} fill className="object-contain" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Multiple Perspectives - Linear-inspired minimal design */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Asymmetric header layout */}
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-3">Why this matters</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
                Different models,<br />
                <span className="text-slate-500">different strengths.</span>
              </h2>
            </motion.div>
            <motion.div
              className="lg:col-span-7 lg:pt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                Each AI model is trained on different data with different architectures.
                What one misses, another catches. Combining perspectives eliminates blind spots.
              </p>
            </motion.div>
          </div>

          {/* Feature cards - minimal with hover states */}
          <div className="grid md:grid-cols-3 gap-px bg-slate-200 rounded-2xl overflow-hidden">
            {[
              {
                icon: Sparkles,
                title: "Diverse solutions",
                desc: "Claude suggests functional patterns. GPT recommends OOP. Gemini offers a hybrid. See all approaches, then choose."
              },
              {
                icon: Zap,
                title: "More coverage",
                desc: "One model finds the bug. Another spots the security flaw. A third optimizes performance. Together, nothing slips through."
              },
              {
                icon: Code2,
                title: "Zero context switching",
                desc: "Stop juggling tabs between ChatGPT and Claude. Get every perspective in one call, right where you're already working."
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="bg-white p-8 lg:p-10 group cursor-default"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 transition-colors duration-200">
                    <feature.icon className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Minimal numbered steps */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-medium tracking-widest text-slate-400 uppercase mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900">
              Three steps. Thirty seconds.
            </h2>
          </motion.div>

          {/* Numbered steps with connecting line */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 hidden md:block"></div>

            <div className="space-y-0">
              {[
                {
                  num: "01",
                  title: "You're stuck",
                  desc: "Debugging a tricky issue. Making an architecture decision. Reviewing complex code. The usual."
                },
                {
                  num: "02",
                  title: "Ask for perspectives",
                  desc: "Type \"Get multiple perspectives on this\" in your IDE. Polydev sends your code context to multiple models simultaneously."
                },
                {
                  num: "03",
                  title: "Compare and choose",
                  desc: "See how Claude, GPT, and Gemini each approach your problem. Different angles, one decision."
                }
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  className="relative"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                >
                  <div className="flex gap-8 py-8 border-b border-slate-200 last:border-b-0 group">
                    {/* Number */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors duration-200">
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors duration-200">{step.num}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1.5">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                      <p className="text-slate-500 leading-relaxed max-w-xl">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples Demo */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              See It In Action
            </h2>
            <p className="text-slate-600">
              Same problem, different perspectives
            </p>
          </motion.div>

          {/* Example selector */}
          <div className="flex justify-center gap-2 mb-6">
            {CODE_EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => setCurrentExampleIndex(i)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  currentExampleIndex === i
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {example.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <motion.div
            className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid lg:grid-cols-2 gap-0 border border-slate-200 rounded-xl overflow-hidden">
              {/* Code Side */}
              <div className="bg-white border-r border-slate-200">
                {/* Terminal header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                  </div>
                  <div className="text-slate-600 text-sm font-mono">
                    {currentExample.filename}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {currentExampleIndex + 1}/3
                  </div>
                </div>

                {/* Code display */}
                <div className="p-6 h-[380px] overflow-y-auto relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentExampleIndex}
                      initial={{ opacity: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(10px)' }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="absolute inset-6"
                    >
                      <div className="text-xs text-slate-600 mb-4 font-mono">
                        {currentExample.problem}
                      </div>
                      <pre className="text-slate-900 text-sm font-mono leading-relaxed">
                        <code>{currentExample.code}</code>
                      </pre>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Responses Side */}
              <div className="bg-slate-50 p-6 h-[444px] overflow-y-auto">
                <div className="mb-6 sticky top-0 bg-slate-50 pb-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    AI Analysis
                  </h3>
                  <p className="text-xs text-slate-600">
                    {currentExample.responses.length} different approaches
                  </p>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="wait">
                    {currentExample.responses.map((response, index) => (
                      <motion.div
                        key={`${currentExampleIndex}-${index}`}
                        initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
                        transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeInOut' }}
                        className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                            <Image
                              src={response.avatar}
                              alt={response.model}
                              width={32}
                              height={32}
                              className="object-contain p-1"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 mb-2">
                              {response.model}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {response.text}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Setup Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Get Started in 30 Seconds</h2>
            <p className="text-slate-600 mb-4">Works with Claude Code, Cursor, Cline, Windsurf, and more</p>

            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-slate-900 font-medium hover:underline text-sm"
            >
              View detailed setup guides for each IDE
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Quick Setup */}
            <motion.div
              className="border border-slate-200 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">Quick Setup</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Recommended</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">1. Get your token from dashboard</div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-xs text-slate-900">
                    POLYDEV_USER_TOKEN=pd_xxx
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">2. Add to your IDE's MCP config</div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-xs text-slate-900 overflow-x-auto">
                    <pre className="whitespace-pre">{`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["--yes", "--package=polydev-ai@latest", "--", "polydev-stdio"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxx" }
    }
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">3. Ask in your editor</div>
                  <div className="bg-slate-100 rounded p-2">
                    <p className="text-sm text-slate-700 italic">"Get multiple perspectives on this"</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bring Your Own Keys */}
            <motion.div
              className="border border-slate-200 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900">Bring Your Own Keys</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Unlimited</span>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                Add your own API keys for unlimited usage at your own costs. Polydev uses your keys first, then falls back to credits.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { name: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
                  { name: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
                  { name: 'Google AI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
                  { name: 'xAI', logo: 'https://models.dev/logos/xai.svg' },
                ].map((provider) => (
                  <div key={provider.name} className="flex items-center gap-2 p-2 border border-slate-200 rounded text-xs">
                    <Image src={provider.logo} alt={provider.name} width={14} height={14} />
                    <span className="text-slate-700">{provider.name}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/auth"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Add API Keys
                <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Simple Pricing</h2>
            <p className="text-slate-600">Start free, upgrade when you need more</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <motion.div
              className="border border-slate-200 rounded-xl p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <p className="text-sm text-slate-600">Try it out</p>
              </div>

              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">500 credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">All AI models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">MCP integration</span>
                </li>
              </ul>

              <div className="text-xs text-slate-500 mb-4 p-3 bg-slate-50 rounded-lg">
                Premium = 20 credits • Normal = 4 credits • Eco = 1 credit
              </div>

              <Link href="/auth" className="w-full block text-center px-6 py-3 border border-slate-900 text-slate-900 rounded-lg font-medium hover:bg-slate-900 hover:text-white transition-colors">
                Get Started
              </Link>
            </motion.div>

            <motion.div
              className="bg-slate-900 text-white rounded-xl p-8 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-4 py-1 rounded-full text-sm font-semibold">
                Popular
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Plus</h3>
                <div className="text-4xl font-bold mb-1">$25</div>
                <p className="text-sm text-slate-400">per month</p>
              </div>

              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>20,000 credits/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Credits rollover</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>All AI models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Priority support</span>
                </li>
              </ul>

              <Link href="/dashboard/subscription" className="w-full block text-center px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
                Upgrade
              </Link>
            </motion.div>

            <motion.div
              className="border border-slate-200 rounded-xl p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$50</div>
                <p className="text-sm text-slate-600">per month</p>
              </div>

              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">50,000 credits/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">Credits rollover</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">All AI models</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-slate-900" />
                  <span className="text-slate-700">Priority support</span>
                </li>
              </ul>

              <Link href="/dashboard/subscription" className="w-full block text-center px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
                Upgrade
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">FAQ</h2>
            <p className="text-xl text-slate-600">Common questions answered</p>
          </motion.div>

          <div className="space-y-4">
            {FAQ_DATA.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQs.includes(index)}
                onToggle={() => toggleFAQ(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-slate-300 mb-8">
              Join developers using Polydev for better solutions
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-all hover:scale-105 shadow-lg"
            >
              Start Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-3 text-sm">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-slate-400 hover:text-white transition-colors text-sm">Documentation</Link></li>
                <li><Link href="/pricing" className="text-slate-400 hover:text-white transition-colors text-sm">Pricing</Link></li>
                <li><Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-slate-400 hover:text-white transition-colors text-sm">Documentation</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Contact</h3>
              <ul className="space-y-2">
                <li><a href="mailto:support@polydev.ai" className="text-slate-400 hover:text-white transition-colors text-sm">support@polydev.ai</a></li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <Link href="/" className="flex items-center">
              <PolydevLogo size={48} className="text-white" />
              <span className="font-semibold text-lg -ml-2">Polydev</span>
            </Link>
            <p className="text-slate-400 text-sm">© 2025 Polydev AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Add custom animations - smooth and subtle */}
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </div>
  )
}
