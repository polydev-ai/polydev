'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../hooks/useAuth'

// Personality themes for dynamic overlays
const PERSONALITIES = [
  {
    id: 'explorer',
    name: '🔮 The Explorer',
    theme: {
      gradient: 'from-purple-600 via-blue-500 to-cyan-500',
      bg: 'from-purple-50 via-blue-50 to-cyan-50/30',
      cta: 'Discover Possibilities',
      subtitle: 'Get multiple AI perspectives when you need diverse approaches to complex problems.'
    }
  },
  {
    id: 'pragmatist',
    name: '🎯 The Pragmatist',
    theme: {
      gradient: 'from-orange-600 via-orange-500 to-violet-600',
      bg: 'from-slate-50 via-white to-orange-50/30',
      cta: 'Get It Done',
      subtitle: 'Ask multiple AI models at once. Compare their responses and pick what works best.'
    }
  },
  {
    id: 'visionary',
    name: '🚀 The Visionary',
    theme: {
      gradient: 'from-emerald-600 via-teal-500 to-cyan-600',
      bg: 'from-emerald-50 via-teal-50 to-cyan-50/30',
      cta: 'Shape the Future',
      subtitle: 'Multiple perspectives in one request. No switching tools, no API juggling.'
    }
  }
]

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
  { logo: 'https://cdn.freelogovectors.net/wp-content/uploads/2025/06/cursor-logo-freelogovectors.net_.png' },
  { logo: 'https://sajalsharma.com/_astro/claude_code.GbHphWWe_Z29KFWg.webp.jpg' },
  { logo: 'https://cline.bot/assets/branding/logos/cline-wordmark-black.svg' },
  { logo: 'https://zed.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_icon.d67dc948.webp&w=750&q=100' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg' }
]

const MODEL_PROVIDERS = [
  { name: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { name: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
  { name: 'Google', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png' },
  { name: 'xAI', logo: 'https://models.dev/logos/xai.svg' }
]

// Typewriter component for dynamic typing effect
function TypewriterText({ text, delay = 30, onComplete, startDelay = 0, className = '' }: {
  text: string;
  delay?: number;
  onComplete?: () => void;
  startDelay?: number;
  className?: string
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    if (startDelay > 0 && !hasStarted) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true)
      }, startDelay)
      return () => clearTimeout(startTimeout)
    } else if (startDelay === 0) {
      setHasStarted(true)
    }
  }, [startDelay, hasStarted, isMounted])

  useEffect(() => {
    if (!isMounted) return

    if (hasStarted && currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, delay)
      return () => clearTimeout(timeout)
    } else if (hasStarted && currentIndex >= text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, delay, onComplete, hasStarted, isMounted])

  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
    setHasStarted(false)
  }, [text])

  if (!isMounted) {
    return <span></span>
  }

  return <span className={className}>{displayedText}{hasStarted && currentIndex < text.length && <span className="animate-pulse">|</span>}</span>
}

// Collapsible FAQ Item
function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
      <button
        onClick={onToggle}
        className="w-full text-left p-8 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-50 rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 pr-4">{question}</h3>
          <div className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="px-8 pb-8">
          <p className="text-slate-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

const CODE_EXAMPLES = [
  {
    title: "React State Management Complexity",
    language: "TypeScript",
    filename: "shopping-cart.tsx",
    problem: "// Complex state updates causing bugs and performance issues",
    code: `function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [discounts, setDiscounts] = useState({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Recalculating total on every render - expensive
    const newTotal = items.reduce((sum, item) => {
      const discount = discounts[item.id] || 0;
      return sum + (item.price * item.quantity * (1 - discount));
    }, 0);
    setTotal(newTotal);
  }, [items, discounts]);

  const updateQuantity = (id, quantity) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };
}`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "This approach has multiple issues: unnecessary re-renders, scattered state updates, and no optimistic updates. Use useReducer for complex state logic with actions like ADD_ITEM, UPDATE_QUANTITY, APPLY_DISCOUNT. Implement useMemo for expensive calculations and consider using Zustand or Redux Toolkit for global state. Add error boundaries and implement optimistic updates for better UX.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Replace multiple useState with a single useReducer to ensure state consistency. Implement memoization with useMemo for total calculation and useCallback for update functions. Consider using React Query for server state management and local state for UI-only concerns. Add TypeScript interfaces for better type safety and implement proper error handling with React Error Boundaries.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Implement a proper state management solution like Redux Toolkit with RTK Query for API calls, or use Jotai for atomic state management. Add middleware for logging, persistence, and analytics. Implement proper loading states, optimistic updates, and conflict resolution. Consider using Immer for immutable updates and add React DevTools for debugging state changes.",
        typing: true
      }
    ]
  },
  {
    title: "Kubernetes Deployment Issues",
    language: "YAML",
    filename: "deployment.yaml",
    problem: "// Pods crashing and poor resource utilization",
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myapp:latest
        ports:
        - containerPort: 3000
        # Missing resource limits and health checks`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Critical missing configurations: Add resource requests/limits to prevent OOMKilled pods, implement readiness/liveness probes for proper health checking, use specific image tags instead of 'latest' for reproducible deployments, add security context with non-root user, and implement proper graceful shutdown with terminationGracePeriodSeconds. Consider using init containers for setup tasks.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Add comprehensive monitoring and observability: resource limits (memory: 512Mi, cpu: 500m), health checks with proper endpoints, pod disruption budgets for high availability, horizontal pod autoscaler based on CPU/memory metrics, and proper labels for monitoring. Implement rolling update strategy with maxSurge and maxUnavailable settings for zero-downtime deployments.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Implement a complete production-ready configuration: add ConfigMaps and Secrets for configuration management, use NetworkPolicies for security, implement service mesh with Istio for traffic management, add monitoring with Prometheus/Grafana, use admission controllers for policy enforcement, and implement GitOps workflow with ArgoCD for automated deployments.",
        typing: true
      }
    ]
  },
  {
    title: "Security Vulnerability Assessment",
    language: "Python",
    filename: "auth_handler.py",
    problem: "// Authentication system with security flaws",
    code: `import hashlib
import jwt

class AuthHandler:
    def __init__(self):
        self.secret = "mysecret123"  # Hardcoded secret

    def login(self, username, password):
        # SQL injection vulnerable
        query = f"SELECT * FROM users WHERE username='{username}' AND password='{hashlib.md5(password.encode()).hexdigest()}'"
        user = db.execute(query)

        if user:
            token = jwt.encode({"user_id": user.id}, self.secret, algorithm="HS256")
            return {"token": token}
        return None`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Multiple critical security vulnerabilities: Use parameterized queries to prevent SQL injection, replace MD5 with bcrypt/scrypt for password hashing, store secrets in environment variables or secret management systems, implement rate limiting to prevent brute force attacks, add proper session management with secure cookies, and use HTTPS only. Consider implementing OAuth2/OIDC for authentication.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Implement comprehensive security measures: use ORM with parameterized queries, bcrypt with salt for password hashing, environment-based secret management, JWT with proper expiration and refresh tokens, implement CSRF protection, add input validation and sanitization, use secure headers (HSTS, CSP), and implement proper logging for security events. Add MFA for additional security.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Build a production-grade security system: implement OAuth2 with PKCE, use AWS Cognito or Auth0 for authentication service, add comprehensive audit logging, implement zero-trust architecture, use secrets management (HashiCorp Vault, AWS Secrets Manager), add penetration testing with OWASP ZAP, implement security headers with helmet.js equivalent, and use dependency scanning for vulnerabilities.",
        typing: true
      }
    ]
  }
]

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [currentPersonality, setCurrentPersonality] = useState(PERSONALITIES[1])
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
  const [modelStats, setModelStats] = useState({ totalModels: 346, totalProviders: 37 })
  const [openFAQs, setOpenFAQs] = useState<number[]>([])

  useEffect(() => {
    setIsMounted(true)
    fetchModelsDevStats().then(setModelStats)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % CODE_EXAMPLES.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const currentExample = CODE_EXAMPLES[currentExampleIndex]

  const toggleFAQ = (index: number) => {
    setOpenFAQs(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const faqData = [
    {
      question: "How do I trigger multiple perspectives?",
      answer: "You manually ask your MCP-enabled editor (Claude Code, Cursor, Cline) to get perspectives using a tool call. Example: 'Can you get multiple perspectives on debugging this React issue?' Your editor uses the MCP protocol to call Polydev."
    },
    {
      question: "What context do models receive?",
      answer: "Models receive the context your MCP client provides - typically your current code, error messages, and project context. They see what your editor shares through the MCP protocol, not your entire codebase automatically."
    },
    {
      question: "Which models are available?",
      answer: "Free tier: 10 credits to try various models. Pro tier: 1,500 credits for GPT-5, Claude Opus 4, Gemini 2.5 Pro (5 credits each), plus faster models like GPT-5 Mini, Claude Haiku, Grok 4 Fast (1 credit each)."
    },
    {
      question: "How is this different from using ChatGPT/Claude separately?",
      answer: "Instead of manually copying your code to different AI chat interfaces, you get multiple model responses in one request through your editor. Save time, compare approaches side-by-side, and get diverse solutions without context switching."
    },
    {
      question: "What editors and tools are supported?",
      answer: "Any MCP-compatible client: Claude Code, Cursor, Cline, and other editors that support the Model Context Protocol. Setup involves adding our MCP server to your editor's configuration."
    },
    {
      question: "How does the credit system work?",
      answer: "Credits are consumed when you use Polydev's hosted models. Fast models (Claude Haiku, GPT-5 Mini, Grok 4 Fast) cost 1 credit per perspective. Premium models (Claude Opus 4, GPT-5, Gemini 2.5 Pro) cost 5 credits per perspective. You can also use your own API keys to bypass credits entirely."
    },
    {
      question: "What's the credit breakdown per model?",
      answer: "• Fast models: 1 credit per perspective (Claude Haiku, GPT-5 Mini, Grok 4 Fast)\n• Premium models: 5 credits per perspective (Claude Opus 4, GPT-5, Gemini 2.5 Pro)\n• Free tier: 10 credits total to try any models\n• Pro tier: 1,500 credits monthly"
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Hero */}
      <section className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br ${currentPersonality.theme.bg} transition-all duration-1000 pt-16`}>
        {/* Sophisticated background patterns */}
        <div className="absolute inset-0">
          {/* Main gradient mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.08),transparent_50%)] opacity-60"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,69,19,0.05),transparent_50%)]"></div>

          {/* Sophisticated grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>

          {/* Animated gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-200/20 to-violet-200/20 rounded-full blur-3xl animate-float-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-violet-200/15 to-orange-200/15 rounded-full blur-3xl animate-float-reverse"></div>
        </div>

        {/* Floating model logos with sophisticated positioning */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-10 h-10 opacity-[0.08]">
            <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" fill className="object-contain" />
          </div>
          <div className="absolute top-32 right-[15%] w-8 h-8 opacity-[0.06]">
            <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" fill className="object-contain" />
          </div>
          <div className="absolute bottom-40 left-[20%] w-12 h-12 opacity-[0.07]">
            <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" alt="Google" fill className="object-contain" />
          </div>

          {/* Sophisticated geometric elements */}
          <div className="absolute top-1/3 right-1/3 w-2 h-16 bg-gradient-to-b from-orange-300/20 to-transparent rounded-full hidden lg:block animate-float-delayed"></div>
          <div className="absolute bottom-1/3 left-1/3 w-16 h-2 bg-gradient-to-r from-violet-300/20 to-transparent rounded-full hidden lg:block animate-float"></div>
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-orange-400/60 rounded-full hidden sm:block"></div>
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-violet-400/60 rounded-full hidden sm:block"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-4">
          <div className="text-center">
            <div className="mx-auto max-w-5xl">
              {/* Personality Selector */}
              <div className="flex justify-center mb-8">
                <div className="flex items-center gap-2 p-2 rounded-full bg-white/90 backdrop-blur-xl border border-white/40 shadow-lg">
                  {PERSONALITIES.map((personality) => (
                    <button
                      key={personality.id}
                      onClick={() => setCurrentPersonality(personality)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        currentPersonality.id === personality.id
                          ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-white/60'
                      }`}
                    >
                      {personality.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sophisticated status indicator */}
              <div className="inline-flex items-center gap-3 mb-6 group">
                <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-lg shadow-orange-100/20 hover:shadow-orange-100/40 transition-all duration-300">
                  <div className="relative">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 tracking-wide">Production Ready</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-500/10 to-orange-500/10 backdrop-blur-xl border border-violet-200/30 hover:border-violet-300/50 transition-all duration-500">
                  <span className="text-sm font-medium text-slate-600">MCP Protocol</span>
                </div>
              </div>

              {/* Hero headline with sophisticated typography */}
              <h1 className="relative">
                <div className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-slate-900 leading-[0.9] mb-6">
                  <div className="inline-block">
                    <span className="relative inline-block">
                      Multi-model
                      <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-violet-500 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
                    </span>
                  </div>
                  <br />
                  <div className="inline-block">
                    <span className={`relative inline-block bg-gradient-to-r ${currentPersonality.theme.gradient} bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] transition-all duration-1000`}>
                      intelligence
                    </span>
                  </div>
                  <br />
                  <div className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-normal text-slate-600 mt-4">
                    in your workflow
                  </div>
                </div>
              </h1>

              {/* Sophisticated description */}
              <div className="mt-8 max-w-4xl mx-auto">
                <p className="text-xl sm:text-2xl leading-relaxed text-slate-600 font-light tracking-wide">
                  {currentPersonality.theme.subtitle}
                  <br className="hidden sm:block" />
                  Compare solutions, validate approaches, improve quality—
                  <span className="relative inline-block">
                    <span className="font-medium text-slate-800">zero context switching</span>
                    <div className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r ${currentPersonality.theme.gradient} rounded-full transition-all duration-1000`}></div>
                  </span>.
                </p>
              </div>

              {/* Sophisticated model showcase */}
              <div className="mt-12 flex flex-col items-center gap-8">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {MODEL_PROVIDERS.map((provider, index) => (
                    <div key={provider.name} className="group relative">
                      <div className="relative w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40 p-2 hover:bg-white/80 hover:border-orange-200/60 transition-all duration-500 hover:scale-110 shadow-lg hover:shadow-xl">
                        <Image src={provider.logo} alt={provider.name} fill className="object-contain p-0.5" />
                      </div>
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-medium text-slate-600 whitespace-nowrap bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                          {provider.name}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-100/60 to-violet-100/60 backdrop-blur-sm border border-orange-200/40">
                    <span className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">
                      +{modelStats.totalProviders} providers
                    </span>
                  </div>
                </div>
              </div>

              {/* Sophisticated action buttons */}
              <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 px-4">
                {isMounted ? (
                  <Link
                    href={isAuthenticated ? '/dashboard' : '/auth'}
                    className="group relative w-full sm:w-auto"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-violet-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative px-8 py-4 bg-gradient-to-r from-orange-500 to-violet-500 rounded-2xl text-white font-semibold text-lg transition-all duration-300 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        {isAuthenticated ? 'Launch Console' : currentPersonality.theme.cta}
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="group relative w-full sm:w-auto">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-violet-500 rounded-2xl blur opacity-30"></div>
                    <div className="relative px-8 py-4 bg-gradient-to-r from-orange-500 to-violet-500 rounded-2xl text-white font-semibold text-lg">
                      <span className="relative flex items-center justify-center gap-2">
                        Start Building
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                )}

                <Link
                  href="/docs"
                  className="group w-full sm:w-auto px-8 py-4 rounded-2xl border-2 border-slate-200/60 bg-white/60 backdrop-blur-xl text-slate-700 font-semibold text-lg transition-all duration-500 hover:border-orange-300/60 hover:bg-white/80 hover:text-slate-900 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Documentation
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>

          </div>

          {/* Stats */}
          <div className="mt-12 sm:mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8 lg:gap-16 px-4">
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

      {/* How it Works Section */}
      <section className="relative py-20 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Stop debugging <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">alone</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Get multiple perspectives on your code, right where you're already working
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 relative">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold border-4 border-white">
                    1
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">MCP auto-detects when you're stuck</h3>
              <p className="text-slate-600 leading-relaxed">
                When you're debugging or need help in Claude Code, Cursor, or Cline, your MCP client automatically sends context to Polydev. No manual requests—it just works when you need it.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 relative">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold border-4 border-white">
                    2
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Models analyze your actual code</h3>
              <p className="text-slate-600 leading-relaxed">
                Each model sees your entire project context—your files, dependencies, recent changes. They understand what you're actually working on, not just your question.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300 relative">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold border-4 border-white">
                    3
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Compare and choose the best approach</h3>
              <p className="text-slate-600 leading-relaxed">
                See different solutions side by side. One model might catch an edge case another missed. Pick the approach that makes the most sense for your situation.
              </p>
            </div>

            {/* Connection lines */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-300 via-purple-300 to-green-300"></div>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Better solutions</h3>
              <p className="text-slate-600 leading-relaxed">
                Different models excel at different things. Get the best of each without the hassle.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Stay in flow</h3>
              <p className="text-slate-600 leading-relaxed">
                No tab switching, no copy-pasting. Everything happens right in your editor.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Remembers context</h3>
              <p className="text-slate-600 leading-relaxed">
                Picks up where you left off, even across sessions. No more explaining your project every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section with Typewriter Effect */}
      <section className="relative py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(-45deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-100 to-orange-100 text-violet-700 rounded-full text-sm font-medium mb-8 border border-violet-200/50 shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Live demo - Multiple AI perspectives
            </div>
            <h2 className="text-4xl sm:text-6xl font-bold text-slate-900 mb-8 leading-tight">
              Multiple Problems,<br />
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">Multiple Perspectives</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              See how different AI models approach the same coding challenge. Each brings unique insights,
              <br className="hidden sm:block" />
              catching edge cases others might miss.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-50/80 via-white to-slate-100/50 rounded-3xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 overflow-hidden backdrop-blur-xl">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Code Editor Side */}
              <div className="relative">
                {/* Window Controls */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-slate-600 text-sm font-medium">
                    {currentExample.filename}
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    Problem {currentExampleIndex + 1}/3
                  </div>
                </div>

                {/* Code Content */}
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-900 font-mono text-sm leading-relaxed min-h-[400px]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-red-300 text-xs font-medium uppercase tracking-wider">{currentExample.title}</span>
                  </div>

                  <div className="text-slate-400 mb-4 italic">
                    {currentExample.problem}
                  </div>

                  <pre className="text-slate-900 whitespace-pre-wrap leading-relaxed">
                    {currentExample.code}
                  </pre>

                  {/* Performance Alert */}
                  <div className="mt-6 flex items-center gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-300 text-xs">Performance issue detected: Multiple state updates causing unnecessary re-renders</span>
                  </div>
                </div>
              </div>

              {/* AI Responses Side */}
              <div className="bg-gradient-to-br from-white to-slate-50/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">AI Perspectives</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-700 text-xs font-medium">3 responses</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentExample.responses.map((response, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-white to-slate-50/50 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm flex-shrink-0">
                          <Image src={response.avatar} alt={response.model} fill className="object-contain p-1" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-slate-900">{response.model}</span>
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              <span className="text-xs text-emerald-600 ml-1 font-medium">typing</span>
                            </div>
                          </div>
                          <div className="text-slate-600 text-sm leading-relaxed min-h-[4rem]">
                            <TypewriterText
                              text={response.text}
                              delay={20}
                              startDelay={index * 1000}
                              className="block"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Processing Engine */}
                <div className="mt-6 p-4 bg-gradient-to-r from-violet-500/10 to-orange-500/10 rounded-2xl border border-violet-200/30">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-gradient-to-r from-violet-500 to-orange-500 rounded-full animate-spin"></div>
                    </div>
                    <span className="text-slate-700 font-semibold text-sm">Polydev Engine</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-600 text-xs">Processing perspectives from multiple models</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Setup Section */}
      <section className="relative py-20 bg-gradient-to-br from-slate-50 via-white to-orange-50/30 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,69,19,0.03),transparent_50%)]"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Setup
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Get Started in <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">30 Seconds</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Choose your setup method and start getting multiple AI perspectives immediately
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Option 1: CLI Tools */}
            <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-3xl border border-emerald-200/60 p-8 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Option 1: CLI Tools</h3>
                  <p className="text-emerald-600 font-medium">Recommended - Auto-detects when you need help</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/80 rounded-2xl p-6 border border-emerald-100">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Get your token from dashboard
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
                    <code className="text-emerald-400 font-mono text-sm">
                      POLYDEV_USER_TOKEN=pd_your_token_here
                    </code>
                  </div>
                  <p className="text-slate-600 text-sm">Visit <Link href="/auth" className="text-emerald-600 hover:text-emerald-700 font-medium">dashboard</Link> → Settings → Copy your user token</p>
                </div>

                <div className="bg-white/80 rounded-2xl p-6 border border-emerald-100">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Add to your MCP config
                  </h4>

                  {/* Claude Code */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Image src="https://sajalsharma.com/_astro/claude_code.GbHphWWe_Z29KFWg.webp.jpg" alt="Claude Code" width={16} height={16} className="rounded" />
                      <span className="font-medium text-slate-700">Claude Code</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                      <code className="text-green-400 font-mono">
{`{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest", "polydev-stdio"],
      "env": {"POLYDEV_USER_TOKEN": "pd_your_token_here"}
    }
  }
}`}
                      </code>
                    </div>
                  </div>

                  {/* Cursor */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Image src="https://cdn.freelogovectors.net/wp-content/uploads/2025/06/cursor-logo-freelogovectors.net_.png" alt="Cursor" width={16} height={16} className="rounded" />
                      <span className="font-medium text-slate-700">Cursor</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                      <code className="text-green-400 font-mono">
{`[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest", "polydev-stdio"]
env = { POLYDEV_USER_TOKEN = "pd_your_token_here" }`}
                      </code>
                    </div>
                  </div>

                  {/* Cline */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Image src="https://cline.bot/assets/branding/logos/cline-wordmark-black.svg" alt="Cline" width={16} height={16} className="rounded" />
                      <span className="font-medium text-slate-700">Cline</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs">
                      <code className="text-green-400 font-mono">
{`"polydev": {
  "command": "npx",
  "args": ["-y", "polydev-ai@latest", "polydev-stdio"],
  "env": {"POLYDEV_USER_TOKEN": "pd_your_token_here"}
}`}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 rounded-2xl p-6 border border-emerald-100">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Ask for perspectives in your editor
                  </h4>
                  <div className="bg-emerald-50 rounded-xl p-4 border-l-4 border-emerald-500">
                    <p className="text-slate-800 font-medium italic">
                      "Can you get multiple perspectives on optimizing this React component?"
                    </p>
                  </div>
                  <p className="text-slate-600 text-sm mt-2">Your editor will automatically provide context to get relevant advice</p>
                </div>
              </div>
            </div>

            {/* Option 2: API Keys */}
            <div className="bg-gradient-to-br from-white to-violet-50/30 rounded-3xl border border-violet-200/60 p-8 shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Option 2: API Keys</h3>
                  <p className="text-violet-600 font-medium">Use your own API keys for unlimited access</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/80 rounded-2xl p-6 border border-violet-100">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Get API keys from providers
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" width={20} height={20} />
                      <span className="text-sm font-medium text-slate-700">OpenAI</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" width={20} height={20} />
                      <span className="text-sm font-medium text-slate-700">Anthropic</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png" alt="Google" width={20} height={20} />
                      <span className="text-sm font-medium text-slate-700">Google AI</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Image src="https://models.dev/logos/xai.svg" alt="xAI" width={20} height={20} />
                      <span className="text-sm font-medium text-slate-700">xAI</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 rounded-2xl p-6 border border-violet-100">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Add them to your dashboard
                  </h4>
                  <p className="text-slate-600 mb-4">Save your API keys securely in the Polydev dashboard</p>
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                    <div className="flex items-center gap-2 text-violet-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.414-4.414a2 2 0 00-2.828 0L4 12v4h4l7.586-7.586a2 2 0 000-2.828z" />
                      </svg>
                      <span className="font-medium text-sm">Dashboard → Settings → API Keys</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 rounded-2xl p-6 border border-violet-100">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-violet-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Configure MCP (optional token)
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
                    <code className="text-violet-400 font-mono text-sm">
                      npx polydev-ai@latest polydev-stdio
                    </code>
                  </div>
                  <p className="text-slate-600 text-sm">No token needed - uses your dashboard API keys automatically</p>
                </div>

                <Link
                  href="/auth"
                  className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-2xl font-semibold text-lg hover:from-violet-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                  </svg>
                  Go to Dashboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Memory Instructions */}
          <div className="mt-16 bg-gradient-to-br from-orange-50 to-yellow-50/50 rounded-3xl border border-orange-200/60 p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro Tip: Add Memory Instructions</h3>
              <p className="text-slate-600 max-w-2xl mx-auto">Add this to your MCP client's memory to automatically trigger perspectives when needed</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-orange-200/60">
              <h4 className="font-semibold text-slate-900 mb-4">Add to Claude Code/Cursor/Cline Memory:</h4>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <code className="text-orange-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
{`When I'm struggling with a coding problem, debugging an issue, or need different approaches to solve something, automatically use the get_perspectives tool from Polydev MCP to get multiple AI model responses. This helps me see different solutions and pick the best approach.

Examples when to use:
- "This React component is re-rendering too much"
- "My API is slow, how can I optimize it?"
- "I'm getting this error and can't figure it out"
- "What's the best way to implement this feature?"

Use get_perspectives to get responses from Claude, GPT-5, Gemini, and other models simultaneously.`}
                </code>
              </div>
              <p className="text-slate-600 text-sm mt-3">This helps your editor know when to automatically call Polydev for multiple perspectives</p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section className="relative py-20 bg-gradient-to-br from-white via-slate-50/20 to-violet-50/30 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,69,19,0.03),transparent_50%)]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Simple Pricing
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Pay for <span className="bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent">What You Use</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Choose credits for convenience or use your own API keys for unlimited access
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Free Tier */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-3xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-500">
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <div className="text-slate-600">Try before you buy</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">10 Polydev credits</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">MCP integration</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">All fast models</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Use your own API keys</span>
                </li>
              </ul>

              <Link
                href="/auth"
                className="w-full block text-center px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-2xl font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all duration-300"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-gradient-to-br from-violet-50 to-orange-50/50 rounded-3xl border-2 border-violet-300/60 p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 relative scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-violet-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$25</div>
                <div className="text-slate-600">1,500 credits included</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">1,500 Polydev credits</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">All premium models</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Priority processing</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Extra credits: 500 for $10</span>
                </li>
              </ul>

              <Link
                href="/auth"
                className="w-full block text-center px-6 py-4 bg-gradient-to-r from-violet-500 to-orange-500 text-white rounded-2xl font-bold text-lg hover:from-violet-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Upgrade to Pro
              </Link>
            </div>

          </div>

          {/* Credit Breakdown */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-200/60 p-8 shadow-xl">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-slate-900 mb-4">Credit Breakdown</h3>
              <p className="text-xl text-slate-600">Different models, different costs. Choose what works for your needs.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <span className="text-emerald-600 font-bold text-xl">1</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Fast Models</h4>
                    <p className="text-slate-600">1 credit per perspective</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">GPT-5 Mini</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Claude Haiku</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Grok 4 Fast</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Gemini Flash</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">GLM 4.5</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Qwen Coder</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-violet-200/60 p-8 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                    <span className="text-violet-600 font-bold text-xl">5</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Premium Models</h4>
                    <p className="text-slate-600">5 credits per perspective</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">GPT-5</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Claude Opus 4</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Claude Sonnet 4</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Gemini 2.5 Pro</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">Grok 4</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">o1-preview</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Proposition */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h5 className="font-semibold text-slate-900 mb-2">Save Time</h5>
                <p className="text-sm text-slate-600">Get multiple perspectives in one request vs. querying each model separately</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-2xl">
                <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h5 className="font-semibold text-slate-900 mb-2">Cost Effective</h5>
                <p className="text-sm text-slate-600">One credit can cost less than a single API call to premium models</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h5 className="font-semibold text-slate-900 mb-2">Better Results</h5>
                <p className="text-sm text-slate-600">Compare approaches and choose the best solution for your specific case</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-16 bg-gradient-to-br from-orange-50/60 via-white/80 to-violet-50/60 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">FAQ</h2>
            <p className="text-xl text-slate-600">Common questions answered</p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
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

      {/* Modern Footer */}
      <footer className="relative py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.1),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="text-xl font-bold">Polydev</span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6">
                Multi-model intelligence in your workflow. Get unstuck faster with diverse AI perspectives.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="https://github.com/polydev-ai/perspectives-mcp"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                </Link>
                <Link
                  href="https://discord.gg/polydev"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Products */}
            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3">
                <li><Link href="/docs" className="text-slate-400 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/api" className="text-slate-400 hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link href="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/examples" className="text-slate-400 hover:text-white transition-colors">Examples</Link></li>
                <li><Link href="/changelog" className="text-slate-400 hover:text-white transition-colors">Changelog</Link></li>
                <li><Link href="/status" className="text-slate-400 hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors">About</Link></li>
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/support" className="text-slate-400 hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © 2025 Polydev AI. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Built with</span>
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>by developers, for developers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}