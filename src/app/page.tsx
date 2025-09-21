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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <section className={`relative min-h-[40vh] flex items-center justify-center overflow-hidden bg-gradient-to-br ${currentPersonality.theme.bg} transition-all duration-1000`}>
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
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-orange-400/40 rounded-full animate-ping hidden sm:block"></div>
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-violet-400/40 rounded-full animate-ping hidden sm:block" style={{animationDelay: '1s'}}></div>
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
                    <div className="absolute inset-0 w-2 h-2 bg-orange-400 rounded-full animate-ping opacity-20"></div>
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

      {/* Multiple Perspectives Demo */}
      <section className="relative py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(-45deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
              Multiple Problems, <span className="bg-gradient-to-r from-violet-600 to-orange-600 bg-clip-text text-transparent">Multiple Perspectives</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Watch AI models solve different challenges simultaneously with diverse approaches
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="relative py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
                  <div className="text-slate-300 text-sm font-medium">
                    {currentExample.filename}
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    Problem {currentExampleIndex + 1}/3
                  </div>
                </div>

                {/* Code Content */}
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-mono text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-300 text-xs font-medium uppercase tracking-wider">{currentExample.title}</span>
                  </div>

                  <div className="text-slate-400 mb-4 italic">
                    {currentExample.problem}
                  </div>

                  <pre className="text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {currentExample.code}
                  </pre>
                </div>

                {/* Processing Indicator */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-center p-4 bg-gradient-to-r from-violet-500/90 to-orange-500/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-4 h-4 bg-white/80 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-ping opacity-20"></div>
                      </div>
                      <span className="text-white font-semibold">Polydev Engine</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-slate-600 text-sm">Processing perspectives</span>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-emerald-600 font-medium">Claude</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-blue-600 font-medium">GPT-5</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-orange-600 font-medium">Gemini</span>
                    </div>
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
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm">
                          <Image src={response.avatar} alt={response.model} fill className="object-contain p-1" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-slate-900">{response.model}</span>
                            {response.typing && (
                              <div className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                <span className="text-xs text-slate-500 ml-1">typing</span>
                              </div>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {response.text}
                          </p>
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

      {/* Setup Section */}
      <section className="relative py-16 bg-gradient-to-b from-white via-slate-50/30 to-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Setup</h2>
            <p className="text-xl text-slate-600">Get started in 30 seconds</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">With CLI tools</h3>
              </div>

              <p className="text-slate-600 mb-6">If you have Claude Code, Cursor, or Cline, just add this to your MCP config:</p>

              <div className="bg-slate-900 rounded-xl p-4 mb-6 overflow-x-auto">
                <code className="text-green-400 font-mono text-sm whitespace-nowrap">
                  npx polydev-ai@latest polydev-stdio
                </code>
              </div>

              <div className="text-sm text-slate-500 mb-4">Then in your editor:</div>
              <div className="bg-slate-100 rounded-xl p-4 border-l-4 border-blue-500">
                <p className="text-slate-800 text-sm italic">
                  "Can you get multiple perspectives on debugging React re-renders?"
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">With API keys</h3>
              </div>

              <p className="text-slate-600 mb-6">No CLI tools? Add your own API keys at the dashboard:</p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                  <span className="text-slate-700">Visit the dashboard</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                  <span className="text-slate-700">Add API keys for OpenAI, Anthropic, etc.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                  <span className="text-slate-700">Use the MCP tool in your editor</span>
                </div>
              </div>

              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-600 transition-all duration-300"
              >
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Pricing</h2>
            <p className="text-xl text-slate-600">Simple, transparent pricing</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">$0</div>
                <div className="text-slate-600">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">1,000 requests per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">3 models: GPT-4, Claude, Gemini</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">MCP integration</span>
                </li>
              </ul>

              <Link
                href="/auth"
                className="w-full block text-center px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:border-slate-400 hover:bg-slate-50 transition-all duration-300"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-orange-50/50 rounded-2xl border-2 border-violet-200/60 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-violet-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-slate-900 mb-1">Pay per use</div>
                <div className="text-slate-600">no subscription</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Unlimited requests</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">All models including GPT-5, Grok</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">CLI tool integration</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">Project memory (optional)</span>
                </li>
              </ul>

              <Link
                href="/auth"
                className="w-full block text-center px-6 py-3 bg-gradient-to-r from-violet-500 to-orange-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-orange-600 transition-all duration-300"
              >
                Upgrade
              </Link>
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

          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">How does MCP auto-detect when I'm stuck?</h3>
              <p className="text-slate-600 leading-relaxed">
                It doesn't auto-detect. You manually call the MCP tool when you want multiple perspectives.
                Think of it as asking "Can you get multiple opinions on this?" in your editor.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Do models see my project files?</h3>
              <p className="text-slate-600 leading-relaxed">
                Only if you enable project memory (Pro feature). By default, models only see your specific question.
                Project memory can optionally include recent conversations and relevant file context.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Which models respond?</h3>
              <p className="text-slate-600 leading-relaxed">
                Free tier: GPT-4, Claude-3-Sonnet, Gemini-Pro. Pro tier: All models including GPT-5, Claude-4-Opus, Grok-4, and others.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">How is this different from using models individually?</h3>
              <p className="text-slate-600 leading-relaxed">
                Instead of asking ChatGPT, then Claude, then others separately, you get all responses at once to compare approaches.
                Different models excel at different things - one might catch an edge case another missed.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">What editors work?</h3>
              <p className="text-slate-600 leading-relaxed">
                Any editor that supports MCP (Model Context Protocol): Claude Code, Cursor, Cline, and others.
                Setup takes about 30 seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-4 bg-gradient-to-br from-white via-slate-50/20 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <Link href="/docs" className="text-slate-600 hover:text-slate-900 transition-colors">Docs</Link>
              <Link href="/auth" className="text-slate-600 hover:text-slate-900 transition-colors">Dashboard</Link>
              <Link href="https://github.com/polydev-ai/perspectives-mcp" className="text-slate-600 hover:text-slate-900 transition-colors">GitHub</Link>
            </div>
            <p className="text-slate-500 text-sm">© 2025 Polydev AI. Get unstuck faster.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}