'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Code2, Sparkles, Zap, Check, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const PROVIDERS = [
  { name: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { name: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'xAI', logo: 'https://models.dev/logos/xai.svg' },
  { name: 'Groq', logo: 'https://models.dev/logos/groq.svg' },
  { name: 'OpenRouter', logo: 'https://models.dev/logos/openrouter.svg' }
]

const CODE_EXAMPLES = [
  {
    title: "React State Management Complexity",
    language: "TypeScript",
    filename: "shopping-cart.tsx",
    problem: "// Complex state updates causing bugs and performance issues",
    code: `function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const newTotal = items.reduce((sum, item) =>
      sum + item.price * item.quantity, 0);
    setTotal(newTotal);
  }, [items]);

  useEffect(() => {
    setTotal(total - discount);
  }, [discount]);

  const addItem = (item) => {
    setItems([...items, item]);
    setTotal(total + item.price);
  };
}`,
    responses: [
      {
        model: "Claude Sonnet 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "This approach has multiple issues: unnecessary re-renders from separate state updates, race conditions in useEffect dependencies, and incorrect total calculation. Use useReducer with a single state object to handle cart operations atomically."
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Replace multiple useState with a single useReducer for cart state. Calculate derived values like total directly in render without useEffect. Use useMemo for expensive calculations only when needed."
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Implement a proper state management solution like Zustand or Jotai. Keep cart logic in a single store with computed selectors. This eliminates race conditions and improves performance."
      }
    ]
  },
  {
    title: "Kubernetes Deployment Issues",
    language: "YAML",
    filename: "deployment.yaml",
    problem: "// Pods crashing with OOMKilled errors",
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: myapp:latest
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"`,
    responses: [
      {
        model: "Claude Sonnet 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Memory limits are too restrictive for a Node.js app. Increase limits to at least 512Mi-1Gi. Add liveness/readiness probes with proper timeouts. Consider implementing graceful shutdown handlers."
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Your memory limits are causing OOM kills. Node.js needs headroom for V8 heap. Set requests to 256Mi and limits to 1Gi. Add resource monitoring with Prometheus to track actual usage patterns."
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Insufficient memory allocation. Bump to 512Mi request, 1Gi limit. Add HPA for auto-scaling based on memory/CPU metrics. Implement proper health checks to prevent cascading failures."
      }
    ]
  },
  {
    title: "Security Vulnerability Assessment",
    language: "Python",
    filename: "auth_handler.py",
    problem: "// Authentication endpoint with potential security issues",
    code: `@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']

    query = f"SELECT * FROM users WHERE
             username='{username}' AND
             password='{password}'"

    user = db.execute(query).fetchone()

    if user:
        session['user_id'] = user['id']
        return jsonify({'success': True})
    return jsonify({'success': False})`,
    responses: [
      {
        model: "Claude Sonnet 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Critical SQL injection vulnerability. Use parameterized queries immediately. Never store passwords in plaintext - use bcrypt/argon2. Add rate limiting to prevent brute force attacks. Implement CSRF protection."
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Multiple severe issues: SQL injection, plaintext passwords, no input validation. Switch to ORM with prepared statements. Hash passwords with bcrypt (cost 12+). Add MFA and session timeout policies."
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Urgent fixes needed: Use SQLAlchemy ORM to prevent injection. Hash passwords with Argon2id. Implement JWT tokens with short expiry. Add input sanitization and rate limiting with Redis."
      }
    ]
  }
]

const FAQ_DATA = [
  {
    question: "How do I trigger multiple perspectives?",
    answer: "You manually ask your MCP-enabled editor (Claude Code, Cursor, Cline) to get perspectives using a tool call. Simply ask: 'Can you get multiple perspectives on this?' and your editor will automatically call the Polydev MCP tool with your current context."
  },
  {
    question: "What context do models receive?",
    answer: "Models receive the context your MCP client provides - typically your current file, selected code, recent changes, and your question. The amount of context depends on your editor's MCP implementation and your project size."
  },
  {
    question: "Which models are available?",
    answer: "346+ models from 37+ providers including Claude Sonnet 4, GPT-5, Gemini 2.5 Pro, Grok 4, DeepSeek, and many more. The full list is available in your dashboard and updates automatically as new models are released."
  },
  {
    question: "How is this different from using ChatGPT/Claude separately?",
    answer: "Polydev works directly in your editor with full project context. Instead of copy-pasting code to multiple chat windows, you get responses from all models simultaneously with your actual codebase context - saving 10-15 minutes per comparison."
  },
  {
    question: "Which editors support Polydev?",
    answer: "Any MCP-compatible editor: Claude Code, Cursor (with MCP plugin), Cline (VS Code), Windsurf, and more. If your editor supports the Model Context Protocol, it works with Polydev."
  },
  {
    question: "How does the credit system work?",
    answer: "Credits are our internal currency. 1 perspective call = 1 credit. Different model tiers cost different amounts: Eco models (cheapest), Normal models (balanced), Premium models (most powerful). Your subscription includes a monthly credit allowance."
  },
  {
    question: "Can I use my own API keys instead of credits?",
    answer: "Yes! Add your API keys from OpenAI, Anthropic, Google, etc. in the dashboard. When you have API keys configured, Polydev will use them first before falling back to credits. This gives you unlimited access at your own API costs."
  }
]

const FAQItem = ({ question, answer, isOpen, onToggle }: any) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
    >
      <span className="font-semibold text-slate-900">{question}</span>
      <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="px-6 pb-6 text-slate-600 leading-relaxed">
        {answer}
      </div>
    )}
  </div>
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
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="font-semibold text-lg">Polydev</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/docs" className="text-slate-600 hover:text-slate-900 transition-colors">Docs</Link>
              <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">Pricing</Link>
              <Link href="/auth" className="px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors">
                {user ? 'Dashboard' : 'Get Started'}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Get Multiple AI Perspectives
              <br />
              <span className="text-slate-600">Instantly</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Query Claude, GPT, Gemini, and {stats.models}+ other models simultaneously. Get diverse solutions when you're stuck, all from your editor.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-lg font-semibold hover:bg-slate-800 transition-all"
              >
                Start Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-200 text-slate-900 rounded-lg font-semibold hover:border-slate-300 transition-all"
              >
                View Docs
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-slate-600">
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.models}+</div>
                <div>Models</div>
              </div>
              <div className="w-px h-12 bg-slate-200"></div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.providers}+</div>
                <div>Providers</div>
              </div>
              <div className="w-px h-12 bg-slate-200"></div>
              <div>
                <div className="text-2xl font-bold text-slate-900">Zero</div>
                <div>Setup</div>
              </div>
            </div>
          </motion.div>

          {/* Provider Logos */}
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-60">
            {PROVIDERS.map((provider) => (
              <div key={provider.name} className="relative w-8 h-8 grayscale hover:grayscale-0 transition-all">
                <Image src={provider.logo} alt={provider.name} fill className="object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200">
              <Sparkles className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Multi-Model Perspectives</h3>
              <p className="text-slate-600 leading-relaxed">
                Query Claude, GPT, Gemini, and more simultaneously. Get diverse solutions when you're stuck.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200">
              <Zap className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Intelligent Routing</h3>
              <p className="text-slate-600 leading-relaxed">
                Automatic fallback from CLI tools to API keys to credits. Always get the best response at the lowest cost.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-slate-200">
              <Code2 className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Zero Setup</h3>
              <p className="text-slate-600 leading-relaxed">
                Works instantly with your existing Claude Code, Cline, or Cursor installation. No configuration needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600">Three simple steps to better solutions</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="text-center">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">1</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">MCP auto-detects when you're stuck</h3>
              <p className="text-slate-600 leading-relaxed">
                When you're debugging or need help in Claude Code, Cursor, or Cline, your MCP client automatically sends context to Polydev.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">2</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Models analyze your actual code</h3>
              <p className="text-slate-600 leading-relaxed">
                Each model sees your entire project context—your files, dependencies, recent changes. They understand what you're actually working on.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold">3</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Compare and choose the best approach</h3>
              <p className="text-slate-600 leading-relaxed">
                See different solutions side by side. One model might catch an edge case another missed. Pick what makes sense for your situation.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Better solutions</h3>
              <p className="text-slate-600">Different models excel at different things. Get the best of each without the hassle.</p>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Stay in flow</h3>
              <p className="text-slate-600">No tab switching, no copy-pasting. Everything happens right in your editor.</p>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Remembers context</h3>
              <p className="text-slate-600">Picks up where you left off, even across sessions. No more explaining your project every time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples Demo */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Multiple Problems, Multiple Perspectives
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto">
              See how different AI models approach the same coding challenge. Each brings unique insights, catching edge cases others might miss.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Code Side */}
              <div className="relative">
                <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-slate-400 text-sm">{currentExample.filename}</div>
                  <div className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                    Problem {currentExampleIndex + 1}/3
                  </div>
                </div>

                <div className="p-6 bg-slate-900 text-slate-100 font-mono text-sm h-[500px] overflow-y-auto">
                  <div className="text-red-400 mb-4 italic text-xs">{currentExample.problem}</div>
                  <pre className="whitespace-pre-wrap">{currentExample.code}</pre>
                </div>
              </div>

              {/* Responses Side */}
              <div className="bg-slate-50 p-6 h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">AI Perspectives</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 text-xs font-medium">3 responses</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentExample.responses.map((response, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex-shrink-0">
                        <Image src={response.avatar} alt={response.model} fill className="object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 mb-2">{response.model}</div>
                        <div className="text-slate-600 text-sm leading-relaxed">{response.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get Started in 30 Seconds</h2>
            <p className="text-xl text-slate-600">Choose your setup method and start getting multiple AI perspectives immediately</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* CLI Tools */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Option 1: CLI Tools</h3>
                  <p className="text-slate-600 font-medium">Recommended - Auto-detects when you need help</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4">1. Get your token from dashboard</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3">
                    <code className="text-sm font-mono">POLYDEV_USER_TOKEN=pd_your_token_here</code>
                  </div>
                  <p className="text-slate-600 text-sm">Visit <Link href="/auth" className="text-black font-medium">dashboard</Link> → Settings → Copy your user token</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4">2. Add to your MCP config</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-slate-700 mb-2">Claude Code / Cline</div>
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs overflow-x-auto">
                        <pre className="text-slate-300">{`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest", "polydev-stdio"],
      "env": {"POLYDEV_USER_TOKEN": "pd_your_token_here"}
    }
  }
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4">3. Ask for perspectives in your editor</h4>
                  <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-black">
                    <p className="text-slate-800 font-medium italic">
                      "Can you get multiple perspectives on optimizing this React component?"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Option 2: API Keys</h3>
                  <p className="text-slate-600 font-medium">Use your own API keys for unlimited access</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4">1. Get API keys from providers</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" width={20} height={20} />
                      <span className="text-sm font-medium">OpenAI</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" width={20} height={20} />
                      <span className="text-sm font-medium">Anthropic</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" alt="Google" width={20} height={20} />
                      <span className="text-sm font-medium">Google AI</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://models.dev/logos/xai.svg" alt="xAI" width={20} height={20} />
                      <span className="text-sm font-medium">xAI</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-4">2. Add them to your dashboard</h4>
                  <p className="text-slate-600 mb-4">Save your API keys securely in the Polydev dashboard</p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-slate-700 text-sm font-medium">Dashboard → Settings → API Keys</p>
                  </div>
                </div>

                <Link
                  href="/auth"
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-black text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple Pricing</h2>
            <p className="text-xl text-slate-600">Choose credits for convenience or use your own API keys for unlimited access</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <div className="text-slate-600">Try before you buy</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>200 Messages / Month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>10 Premium Perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>40 Normal Perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>150 Eco Perspectives</span>
                </li>
              </ul>

              <Link href="/auth" className="w-full block text-center px-6 py-4 border-2 border-slate-200 rounded-xl font-semibold hover:border-slate-300 transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Plus */}
            <div className="bg-slate-900 text-white rounded-2xl p-8 scale-105 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-block bg-white text-slate-900 px-4 py-1 rounded-full text-sm font-bold mb-4">Most Popular</div>
                <h3 className="text-2xl font-bold mb-2">Plus</h3>
                <div className="text-4xl font-bold mb-1">$25</div>
                <div className="text-slate-400">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>Unlimited Messages / Month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>400 Premium Perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>1,600 Normal Perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>4,000 Eco Perspectives</span>
                </li>
              </ul>

              <Link href="/dashboard/subscription" className="w-full block text-center px-6 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-all">
                Upgrade to Plus
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$60</div>
                <div className="text-slate-600">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>Unlimited Messages / Month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>1,200 Premium Perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>4,800 Normal Perspectives</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>10,000 Eco Perspectives</span>
                </li>
              </ul>

              <Link href="/dashboard/subscription" className="w-full block text-center px-6 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">FAQ</h2>
            <p className="text-xl text-slate-600">Common questions answered</p>
          </div>

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
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join developers using Polydev to get better solutions faster
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-all"
          >
            Start Free
            <ArrowRight className="w-5 h-5" />
          </Link>
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
              <div className="flex items-center gap-3">
                <Link href="https://github.com/polydev-ai/perspectives-mcp" className="text-slate-400 hover:text-white transition-colors" target="_blank">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                </Link>
              </div>
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
    </div>
  )
}
