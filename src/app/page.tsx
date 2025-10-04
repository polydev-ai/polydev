'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Code2, Sparkles, Zap, Check, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

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
  { name: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { name: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'xAI', logo: 'https://models.dev/logos/xai.svg' },
  { name: 'Groq', logo: 'https://models.dev/logos/groq.svg' },
  { name: 'OpenRouter', logo: 'https://models.dev/logos/openrouter.svg' }
]

const PROBLEM_SCENARIOS = [
  "React state management bugs?",
  "Kubernetes pods crashing?",
  "Security vulnerabilities found?",
  "Performance bottlenecks?",
  "API design questions?",
  "Database query optimization?"
]

const CODE_EXAMPLES = [
  {
    title: "React State Management",
    filename: "cart.tsx",
    problem: "// Race conditions causing bugs",
    code: `const [items, setItems] = useState([])
const [total, setTotal] = useState(0)

useEffect(() => {
  setTotal(items.reduce((sum, i) =>
    sum + i.price, 0))
}, [items])

// Bug: total updates race with item changes`,
    responses: [
      {
        model: "Claude Sonnet 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Use useReducer to handle cart state atomically. Calculate total directly in render with useMemo. Eliminates race conditions."
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Replace useState with Zustand store. Compute totals as selectors. Better performance and no sync issues."
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Implement custom hook with useReducer. Add memoized selectors for derived state. More maintainable."
      }
    ]
  },
  {
    title: "Kubernetes Memory",
    filename: "deployment.yaml",
    problem: "// Pods keep getting OOMKilled",
    code: `resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"  # Too low for Node.js
    cpu: "200m"`,
    responses: [
      {
        model: "Claude Sonnet 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Bump to 512Mi request, 1Gi limit. Add health checks. Node.js needs headroom for V8 heap."
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Set 1Gi limit minimum. Add HPA for auto-scaling. Monitor with Prometheus to tune settings."
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Increase to 1Gi limit. Implement vertical pod autoscaler. Add proper resource monitoring."
      }
    ]
  },
  {
    title: "Security Issue",
    filename: "auth.py",
    problem: "// SQL injection vulnerability",
    code: `query = f"""
  SELECT * FROM users
  WHERE username='{username}'
  AND password='{password}'  # Dangerous!
"""
user = db.execute(query).fetchone()`,
    responses: [
      {
        model: "Claude Sonnet 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Critical: Use parameterized queries. Hash passwords with bcrypt. Add rate limiting and CSRF tokens."
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Switch to ORM with prepared statements. Never store plaintext passwords. Implement MFA."
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Use SQLAlchemy ORM. Hash with Argon2id. Add JWT tokens and input sanitization."
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
    answer: "346+ models from 37+ providers including Claude Sonnet 4, GPT-5, Gemini 2.5 Pro, Grok 4, DeepSeek, and many more. The full list updates automatically in your dashboard."
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

  const currentExample = CODE_EXAMPLES[currentExampleIndex]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % CODE_EXAMPLES.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const toggleFAQ = (index: number) => {
    setOpenFAQs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-slate-700 rounded-md flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="font-semibold text-lg">Polydev</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/docs" className="text-slate-600 hover:text-slate-900 transition-colors">Docs</Link>
              <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</Link>
              <Link
                href="/auth"
                className="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-lg hover:from-slate-800 hover:to-slate-600 transition-all transform hover:scale-105"
              >
                {user ? 'Dashboard' : 'Get Started'}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-60 animate-grid-flow"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              <TypewriterText texts={PROBLEM_SCENARIOS} />
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                Get Multiple Solutions
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              When you're stuck, query {stats.models}+ AI models at once. Different problems need different perspectives—get them all from your editor.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/auth"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-800 hover:to-slate-600 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-200 text-slate-900 rounded-lg font-semibold hover:border-slate-300 transition-all hover:shadow-md"
              >
                View Docs
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-slate-600">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-2xl font-bold text-slate-900">{stats.models}+</div>
                <div>Models</div>
              </motion.div>
              <div className="w-px h-12 bg-slate-200"></div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-2xl font-bold text-slate-900">{stats.providers}+</div>
                <div>Providers</div>
              </motion.div>
              <div className="w-px h-12 bg-slate-200"></div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-2xl font-bold text-slate-900">Zero</div>
                <div>Setup</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Provider Logos */}
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-60">
            {PROVIDERS.map((provider, i) => (
              <motion.div
                key={provider.name}
                className="relative w-8 h-8 grayscale hover:grayscale-0 transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ scale: 1.2, opacity: 1 }}
              >
                <Image src={provider.logo} alt={provider.name} fill className="object-contain" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: "Multi-Model Perspectives", desc: "Query Claude, GPT, Gemini simultaneously. Get diverse solutions when you're stuck." },
              { icon: Zap, title: "Intelligent Routing", desc: "Auto fallback: CLI tools → API keys → credits. Always best response, lowest cost." },
              { icon: Code2, title: "Zero Setup", desc: "Works instantly with Claude Code, Cline, or Cursor. No configuration needed." }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
              >
                <feature.icon className="w-12 h-12 mb-4 text-slate-700" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600">Three simple steps to better solutions</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { num: "1", title: "Ask in your editor", desc: "When debugging in Claude Code, Cursor, or Cline, ask for perspectives on your code problem." },
              { num: "2", title: "Models analyze context", desc: "Each model sees your files, dependencies, changes. They understand what you're working on." },
              { num: "3", title: "Compare solutions", desc: "See different approaches. One model might catch edge cases others missed." }
            ].map((step, i) => (
              <motion.div
                key={step.num}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 * i }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            {[
              { title: "Better solutions", desc: "Different models excel at different things. Get the best of each." },
              { title: "Stay in flow", desc: "No tab switching, no copy-pasting. Everything in your editor." },
              { title: "Full context", desc: "Models see your actual project, not just snippets." }
            ].map((benefit, i) => (
              <motion.div
                key={benefit.title}
                className="text-center p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i }}
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples Demo - Clean Minimal Design */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Multiple Problems, Multiple Perspectives
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how different AI models approach the same challenge
            </p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Code Side */}
              <div className="bg-slate-900 border-r border-slate-200">
                {/* Terminal header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                  </div>
                  <div className="text-slate-400 text-sm font-mono">
                    {currentExample.filename}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {currentExampleIndex + 1}/3
                  </div>
                </div>

                {/* Code display */}
                <div className="p-6 min-h-[500px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentExampleIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-xs text-slate-500 mb-4 font-mono">
                        {currentExample.problem}
                      </div>
                      <pre className="text-slate-300 text-sm font-mono leading-relaxed">
                        <code>{currentExample.code}</code>
                      </pre>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Responses Side */}
              <div className="bg-slate-50 p-6">
                <div className="mb-6">
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.1 }}
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

          {/* Simple feature cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-slate-900 mb-2">Instant</div>
              <p className="text-sm text-slate-600">Get 3+ perspectives in seconds</p>
            </div>
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-slate-900 mb-2">Context-Aware</div>
              <p className="text-sm text-slate-600">AI models analyze your codebase</p>
            </div>
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-slate-900 mb-2">Comprehensive</div>
              <p className="text-sm text-slate-600">Combine insights for best results</p>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get Started in 30 Seconds</h2>
            <p className="text-lg text-slate-600">Choose your setup method</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* CLI Tools */}
            <motion.div
              className="border border-slate-200 rounded-xl p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Option 1: CLI Tools</h3>
                </div>
                <p className="text-sm text-slate-600 ml-11">Recommended</p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-3">1. Get your token</div>
                  <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100">
                    POLYDEV_USER_TOKEN=pd_your_token_here
                  </div>
                  <p className="text-sm text-slate-500 mt-2">Visit dashboard → Settings → Copy token</p>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-3">2. Add to MCP config</div>
                  <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-x-auto">
                    <pre className="whitespace-pre">{`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token"
      }
    }
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-3">3. Ask in editor</div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm text-slate-700 italic">
                      "Can you get multiple perspectives on this?"
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* API Keys */}
            <motion.div
              className="border border-slate-200 rounded-xl p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Option 2: API Keys</h3>
                </div>
                <p className="text-sm text-slate-600 ml-11">Unlimited access</p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-3">1. Get API keys</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg">
                      <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" width={18} height={18} />
                      <span className="text-sm text-slate-900">OpenAI</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg">
                      <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" width={18} height={18} />
                      <span className="text-sm text-slate-900">Anthropic</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg">
                      <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" alt="Google" width={18} height={18} />
                      <span className="text-sm text-slate-900">Google AI</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg">
                      <Image src="https://models.dev/logos/xai.svg" alt="xAI" width={18} height={18} />
                      <span className="text-sm text-slate-900">xAI</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-3">2. Add to dashboard</div>
                  <p className="text-sm text-slate-600 mb-3">Save keys securely in Polydev</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-sm text-slate-700">Dashboard → Settings → API Keys</p>
                  </div>
                </div>

                <Link
                  href="/auth"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple Pricing</h2>
            <p className="text-xl text-slate-600">Credits or your own API keys</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-xl transition-shadow"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <div className="text-slate-600">Try it out</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>200 Messages</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>10 Premium</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>40 Normal</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>150 Eco</span>
                </li>
              </ul>

              <Link href="/auth" className="w-full block text-center px-6 py-4 border-2 border-slate-200 rounded-xl font-semibold hover:border-slate-300 transition-all hover:shadow-md">
                Get Started
              </Link>
            </motion.div>

            <motion.div
              className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8 scale-105 shadow-2xl"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-center mb-8">
                <div className="inline-block bg-white text-slate-900 px-4 py-1 rounded-full text-sm font-bold mb-4">Popular</div>
                <h3 className="text-2xl font-bold mb-2">Plus</h3>
                <div className="text-4xl font-bold mb-1">$25</div>
                <div className="text-slate-400">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>Unlimited Messages</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>400 Premium</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>1,600 Normal</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>4,000 Eco</span>
                </li>
              </ul>

              <Link href="/dashboard/subscription" className="w-full block text-center px-6 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all hover:shadow-lg">
                Upgrade
              </Link>
            </motion.div>

            <motion.div
              className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-xl transition-shadow"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$60</div>
                <div className="text-slate-600">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>Unlimited Messages</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>1,200 Premium</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>4,800 Normal</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-slate-700" />
                  <span>10,000 Eco</span>
                </li>
              </ul>

              <Link href="/dashboard/subscription" className="w-full block text-center px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl font-semibold hover:from-slate-800 hover:to-slate-600 transition-all hover:shadow-lg">
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
                <li><Link href="/blog" className="text-slate-400 hover:text-white transition-colors text-sm">Blog</Link></li>
                <li><Link href="/changelog" className="text-slate-400 hover:text-white transition-colors text-sm">Changelog</Link></li>
                <li><Link href="/examples" className="text-slate-400 hover:text-white transition-colors text-sm">Examples</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors text-sm">About</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm">Privacy</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm">Terms</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Connect</h3>
              <Link href="https://github.com/polydev-ai/perspectives-mcp" className="text-slate-400 hover:text-white transition-colors" target="_blank">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                <span className="text-slate-900 font-bold text-xs">P</span>
              </div>
              <span className="font-semibold text-sm">Polydev</span>
            </div>
            <p className="text-slate-400 text-sm">© 2025 Polydev AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Add custom animations */}
      <style jsx global>{`
        @keyframes grid-flow {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 64px 64px, 64px 64px; }
        }

        .animate-grid-flow {
          animation: grid-flow 20s linear infinite;
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}
