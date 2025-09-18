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
    title: "Database Query Optimization",
    language: "SQL",
    filename: "user_analytics.sql",
    problem: "// Slow query causing 30s+ response times",
    code: `SELECT u.id, u.name, COUNT(p.id) as post_count,
       AVG(p.likes) as avg_likes
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.created_at > '2024-01-01'
  AND p.status = 'published'
GROUP BY u.id, u.name
ORDER BY post_count DESC;`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "This query has multiple performance issues. Add indexes on users.created_at and posts.status. Consider using EXISTS instead of LEFT JOIN, and add LIMIT to prevent scanning millions of rows. Also, the WHERE clause on p.status turns your LEFT JOIN into an INNER JOIN - move it to the JOIN condition or use a proper INNER JOIN.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "The performance problem is the lack of proper indexing and inefficient joins. Create a composite index on (user_id, status) for posts table, and (created_at) for users. Use window functions instead of GROUP BY for better performance: SELECT DISTINCT u.id, u.name, COUNT(p.id) OVER (PARTITION BY u.id) as post_count, AVG(p.likes) OVER (PARTITION BY u.id) as avg_likes.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Consider denormalizing this data into a materialized view or summary table that updates incrementally. For immediate relief, add covering indexes and use query hints. Long-term, implement read replicas for analytics queries and separate them from transactional workload. Add pagination with cursor-based navigation for large result sets.",
        typing: true
      }
    ]
  },
  {
    title: "Memory Leak Investigation",
    language: "JavaScript",
    filename: "websocket-manager.js",
    problem: "// WebSocket connections causing memory leaks in production",
    code: `class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach(ws => ws.ping());
    }, 30000);
  }

  addConnection(userId, ws) {
    this.connections.set(userId, ws);
    ws.on('close', () => {
      // Bug: not cleaning up properly
      console.log('Connection closed');
    });
  }
}`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Classic memory leak - you're not removing connections from the Map on close. Add this.connections.delete(userId) in the close handler. Also, clear the heartbeat interval in a cleanup method and remove all event listeners. Consider using WeakMap for automatic garbage collection, and implement connection timeouts to prevent zombie connections.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "The memory leak is caused by uncleaned Map references and the global setInterval. Implement proper cleanup: ws.on('close', () => { this.connections.delete(userId); ws.removeAllListeners(); }). Add a destroy() method that clears the interval and closes all connections. Use process monitoring to detect memory growth patterns and implement connection pooling with automatic cleanup.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Beyond the obvious Map cleanup, consider using Node.js cluster mode to isolate connection pools and prevent memory accumulation. Implement circuit breakers for failed connections, add memory monitoring with process.memoryUsage(), and use tools like clinic.js or 0x for heap analysis. Set up alerts when memory usage exceeds thresholds.",
        typing: true
      }
    ]
  },
  {
    title: "Microservices Architecture Design",
    language: "Go",
    filename: "service_mesh.go",
    problem: "// Designing resilient service communication",
    code: `func (c *OrderService) ProcessOrder(ctx context.Context, order *Order) error {
    // Direct service calls - brittle and hard to scale
    inventory := c.inventoryClient.CheckStock(order.ProductID)
    if !inventory.Available {
        return errors.New("out of stock")
    }

    payment := c.paymentClient.ChargeCard(order.Payment)
    if payment.Failed {
        return errors.New("payment failed")
    }

    shipping := c.shippingClient.CreateShipment(order)
    return c.orderRepo.Save(order)
}`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "This synchronous approach creates cascading failures and poor user experience. Implement the Saga pattern for distributed transactions with compensation actions. Use event sourcing: publish OrderRequested event, let each service handle their part asynchronously, and use eventual consistency. Add circuit breakers with hystrix-go and implement proper timeout handling with context.WithTimeout().",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Convert to an event-driven architecture using message queues (NATS, RabbitMQ, or Kafka). Implement the CQRS pattern: command side handles order creation, query side provides order status. Add retry logic with exponential backoff, implement idempotency keys, and use distributed tracing with OpenTelemetry. Consider using gRPC with load balancing and service discovery.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Implement a proper service mesh with Istio or Linkerd for traffic management, security, and observability. Use the Outbox pattern for reliable event publishing, implement health checks with readiness/liveness probes, and add chaos engineering with tools like Chaos Monkey. Design for failure: implement bulkhead pattern, rate limiting, and graceful degradation strategies.",
        typing: true
      }
    ]
  },
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
  },
  {
    title: "Machine Learning Model Deployment",
    language: "Python",
    filename: "model_inference.py",
    problem: "// ML model serving with latency and scaling issues",
    code: `import pickle
import numpy as np
from flask import Flask, request

app = Flask(__name__)

# Loading model on every request - inefficient
@app.route('/predict', methods=['POST'])
def predict():
    # Load model every time
    with open('model.pkl', 'rb') as f:
        model = pickle.load(f)

    data = request.json['features']
    prediction = model.predict(np.array(data).reshape(1, -1))
    return {'prediction': prediction.tolist()}

if __name__ == '__main__':
    app.run(debug=True)  # Debug mode in production`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Multiple performance and production issues: load the model once at startup, not per request. Use gunicorn with multiple workers for better concurrency, implement request validation and error handling, add logging and monitoring, use environment-based configuration, implement caching for repeated predictions, and add health check endpoints. Consider using TensorFlow Serving or TorchServe for better ML model serving.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Implement production-grade ML serving: use FastAPI with async/await for better performance, load model at startup with proper error handling, implement model versioning and A/B testing capabilities, add request batching for throughput optimization, use Redis for caching frequent predictions, implement proper data validation with Pydantic, and add comprehensive monitoring with MLflow or Weights & Biases.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Build a scalable ML infrastructure: containerize with Docker and deploy on Kubernetes with auto-scaling, implement model registry with MLflow, use feature stores for consistent data pipeline, add model monitoring for drift detection, implement CI/CD for model updates, use GPU acceleration with CUDA/TensorRT, implement canary deployments for safe model rollouts, and add comprehensive observability with Prometheus/Grafana.",
        typing: true
      }
    ]
  },
  {
    title: "Real-time Chat Application",
    language: "Node.js",
    filename: "chat_server.js",
    problem: "// WebSocket chat with scaling and reliability issues",
    code: `const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let clients = [];
let messageHistory = [];

wss.on('connection', (ws) => {
  clients.push(ws);

  // Send message history - potential memory issue
  ws.send(JSON.stringify({ type: 'history', messages: messageHistory }));

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    messageHistory.push(message); // Growing infinitely

    // Broadcasting to all clients - no error handling
    clients.forEach(client => {
      client.send(JSON.stringify(message));
    });
  });

  ws.on('close', () => {
    // Bug: not removing closed connections
    console.log('Client disconnected');
  });
});`,
    responses: [
      {
        model: "Claude Opus 4",
        avatar: "https://models.dev/logos/anthropic.svg",
        text: "Critical issues with memory leaks and no error handling: Remove disconnected clients from the array, implement message history pagination instead of loading all messages, add proper error handling for send() operations, implement rate limiting to prevent spam, use Redis for shared state across multiple server instances, add authentication and authorization, and implement proper logging with structured data.",
        typing: true
      },
      {
        model: "GPT-5",
        avatar: "https://models.dev/logos/openai.svg",
        text: "Implement a production-ready chat system: use Socket.io for better browser compatibility and reconnection handling, implement horizontal scaling with Redis adapter, add message persistence with database storage, implement user authentication with JWT, add typing indicators and presence status, implement message encryption for privacy, use clustering for multiple CPU cores, and add comprehensive monitoring.",
        typing: true
      },
      {
        model: "Gemini 2.5 Pro",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
        text: "Build enterprise-grade real-time infrastructure: implement microservices architecture with message queues (Kafka/RabbitMQ), use WebRTC for peer-to-peer video calls, add content moderation with AI, implement message search with Elasticsearch, add file sharing with proper virus scanning, use CDN for static assets, implement proper backup and disaster recovery, and add analytics for user engagement tracking.",
        typing: true
      }
    ]
  }
]

function TypewriterText({ text, delay = 30, onComplete, startDelay = 0 }: { text: string; delay?: number; onComplete?: () => void; startDelay?: number }) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (startDelay > 0 && !hasStarted) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true)
      }, startDelay)
      return () => clearTimeout(startTimeout)
    } else if (startDelay === 0) {
      setHasStarted(true)
    }
  }, [startDelay, hasStarted])

  useEffect(() => {
    if (hasStarted && currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, delay)
      return () => clearTimeout(timeout)
    } else if (hasStarted && currentIndex >= text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, delay, onComplete, hasStarted])

  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
    setHasStarted(false)
  }, [text])

  return <span>{displayedText}{hasStarted && currentIndex < text.length && <span className="animate-pulse">|</span>}</span>
}

function ModelSwitchingDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  const demoSteps = [
    {
      model: "Claude Opus 4",
      avatar: "https://models.dev/logos/anthropic.svg",
      text: "I need help optimizing this database query...",
      status: "thinking",
      color: "text-orange-600"
    },
    {
      model: "Claude Opus 4",
      avatar: "https://models.dev/logos/anthropic.svg",
      text: "Hmm, this is a complex indexing problem. Let me think...",
      status: "stuck",
      color: "text-orange-600"
    },
    {
      model: "GPT-5",
      avatar: "https://models.dev/logos/openai.svg",
      text: "I can help! Try creating a composite index on (user_id, created_at) and use window functions for better performance.",
      status: "solution",
      color: "text-blue-600"
    },
    {
      model: "Gemini 2.5 Pro",
      avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/1024px-Google_Gemini_logo.svg.png",
      text: "Also consider partitioning the table by date ranges and implementing read replicas for analytics workloads.",
      status: "additional",
      color: "text-emerald-600"
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= demoSteps.length - 1) {
          return 0
        }
        return prev + 1
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleTypingComplete = () => {
    setIsTyping(false)
  }

  useEffect(() => {
    setIsTyping(true)
  }, [currentStep])

  const currentDemo = demoSteps[currentStep]

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-slate-900 px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-3 text-slate-300 text-sm font-mono">Polydev Console</span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 p-1.5">
            <Image src={currentDemo.avatar} alt={currentDemo.model} width={20} height={20} className="object-contain" />
          </div>
          <span className={`font-semibold ${currentDemo.color} transition-colors`}>{currentDemo.model}</span>
          {currentDemo.status === "thinking" && (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          )}
          {currentDemo.status === "stuck" && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Switching models...</span>
          )}
          {currentDemo.status === "solution" && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Solution found!</span>
          )}
        </div>
        <div className="bg-gradient-to-br from-orange-50/50 to-violet-50/50 rounded-xl p-4 border border-orange-100/50 min-h-[80px] flex items-center">
          <div className="text-slate-700 leading-relaxed">
            <TypewriterText
              text={currentDemo.text}
              delay={25}
              onComplete={handleTypingComplete}
            />
          </div>
        </div>
      </div>
    </div>
  )
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

            {/* Dynamic Model Switching Demo */}
            <div className="mt-16">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">See smart model switching in action</h3>
                <p className="text-slate-600">When one AI gets stuck, Polydev automatically tries others</p>
              </div>
              <ModelSwitchingDemo />
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
                            startDelay={index * 2000}
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Native integration with your favorite tools</h2>
            <p className="text-lg text-slate-600">Get multi-model perspectives directly in your development environment</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 max-w-4xl mx-auto">
            {SUPPORTED_EDITORS.map((editor, index) => (
              <div key={index} className="group">
                <div className="relative h-16 w-16 p-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 hover:border-orange-200 hover:bg-white/95 transition-all duration-300 hover:scale-110 hover:shadow-xl shadow-lg">
                  <Image src={editor.logo} alt="Editor logo" fill className="object-contain p-1" />
                </div>
              </div>
            ))}
            <div className="group">
              <div className="relative h-16 w-16 p-3 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-dashed border-orange-300 hover:border-orange-400 transition-all duration-300 hover:scale-110 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-slate-500">
              And many more through our <Link href="/docs/integrations" className="text-orange-600 hover:text-orange-700 font-medium">universal MCP protocol</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Free CLI Usage Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-6">
              Get perspectives <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">without spending anything</span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Already using Claude Code, Cursor, or other AI tools? You can get multi-model perspectives completely free using your existing CLI tools.
              No need to add multiple API keys or pay for each provider separately.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Benefits */}
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Use Your Existing CLI Tools</h3>
                  <p className="text-slate-600 leading-relaxed">
                    If you're already authenticated with Claude Code, Cursor, Cline, or other CLI tools, Polydev can route requests through them automatically.
                    Get multiple perspectives using the credits and authentication you already have.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Flexible API Access</h3>
                  <p className="text-slate-600 leading-relaxed mb-3">
                    No need to juggle multiple API keys! Use your existing CLI tools for free, leverage Polydev credits for convenience,
                    or add your own API keys for maximum control and cost optimization.
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                      <div className="font-semibold text-green-700">CLI Tools</div>
                      <div className="text-green-600">Free</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
                      <div className="font-semibold text-orange-700">Credits</div>
                      <div className="text-orange-600">Pay-as-go</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                      <div className="font-semibold text-blue-700">Your Keys</div>
                      <div className="text-blue-600">Full control</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-violet-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Simple Credit System</h3>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    When you want access to all 340+ models, just use Polydev credits. One unified billing, no subscriptions to manage,
                    and you only pay for what you actually use. Start with 100 free requests.
                  </p>
                  <div className="bg-gradient-to-r from-orange-50 to-violet-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-orange-700">💡 Pro Tip:</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      Most developers save 60-80% on AI costs by using Polydev credits instead of maintaining separate subscriptions to each provider.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - CLI Example */}
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="ml-3 text-slate-300 text-sm font-mono">Terminal</span>
                </div>
              </div>
              <div className="p-6 bg-slate-900 font-mono text-sm">
                <div className="text-green-400 mb-2">$ polydev perspectives "optimize this query"</div>
                <div className="text-slate-400 mb-4">✓ Using Claude Code CLI (authenticated)</div>
                <div className="text-slate-400 mb-4">✓ Using Cursor API (authenticated)</div>
                <div className="text-slate-400 mb-4">✓ Fallback to Polydev credits for additional models</div>
                <div className="text-slate-300 mb-2">📊 Getting perspectives from:</div>
                <div className="text-slate-300 ml-4 mb-1">• Claude Opus 4 (via Claude Code)</div>
                <div className="text-slate-300 ml-4 mb-1">• GPT-5 (via Cursor)</div>
                <div className="text-slate-300 ml-4 mb-1">• Gemini 2.5 Pro (via Polydev)</div>
                <div className="text-slate-300 ml-4 mb-4">• DeepSeek V3 (via Polydev)</div>
                <div className="text-blue-400">💸 Cost: $0.00 (using existing CLI authentication)</div>
              </div>
            </div>
          </div>

          {/* Quick Start Options */}
          <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute -top-2 -left-2 w-20 h-20 bg-green-100 rounded-full opacity-30"></div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Already have CLI tools?</h3>
              <p className="text-sm text-slate-600 mb-4">Start getting perspectives immediately with your existing authentication</p>
              <div className="bg-white/70 rounded-lg p-2 mb-4 text-xs text-slate-600">
                🚀 Zero config • Works instantly
              </div>
              <button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm font-medium transform hover:scale-105">
                Quick Setup Guide
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-blue-100 rounded-full opacity-50"></div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">New to AI coding?</h3>
              <p className="text-sm text-slate-600 mb-4">Get 100 free requests to try all models without any API setup</p>
              <div className="bg-white/70 rounded-lg p-2 mb-4 text-xs text-slate-600">
                No credit card • Instant access • 340+ models
              </div>
              <button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm font-medium transform hover:scale-105">
                Start Free Trial
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-violet-50 border border-orange-200 rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br from-orange-100 to-violet-100 rounded-full opacity-40"></div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Need all models?</h3>
              <p className="text-sm text-slate-600 mb-4">Access 340+ models with simple credit-based pricing</p>
              <div className="bg-white/70 rounded-lg p-2 mb-4 text-xs text-slate-600">
                ⚡ Ultra-fast • Pay per use • No subscriptions
              </div>
              <button className="bg-gradient-to-r from-orange-500 to-violet-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm font-medium transform hover:scale-105">
                View All Models
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Deep Dive */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-6">
              Built for <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">modern development workflows</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Polydev leverages cutting-edge technologies to deliver seamless multi-model AI experiences directly in your development environment.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4">MCP-Native Architecture</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Built on the Model Context Protocol (MCP), Polydev seamlessly integrates with your existing CLI tools and development workflows.
                No complex setup or API key management required.
              </p>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Native Claude Code integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Cursor API compatibility
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Zero-config editor plugins
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.586-3.414A2 2 0 0015.586 6H4a2 2 0 00-2 2v6a2 2 0 002 2h11.586a2 2 0 001.414-.586l3-3a2 2 0 000-2.828l-3-3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4">Zero-Knowledge Memory</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Your code and conversations stay private with end-to-end encryption. Polydev remembers context across sessions
                without ever seeing your sensitive data in plaintext.
              </p>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Client-side encryption
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Context-aware responses
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  SOC 2 Type II compliant
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4">Sub-Second Response Times</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Intelligent request routing and caching deliver multiple AI perspectives faster than single-model queries.
                Average response time of 1.7 seconds across all providers.
              </p>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Global edge deployment
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Predictive request routing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Intelligent response caching
                </li>
              </ul>
            </div>
          </div>

          {/* Use Cases */}
          <div className="bg-white rounded-3xl p-12 shadow-2xl border border-slate-200">
            <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">
              Perfect for every development scenario
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Code Reviews</h4>
                <p className="text-sm text-slate-600">Get multiple perspectives on code quality, security, and performance optimizations</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Debugging</h4>
                <p className="text-sm text-slate-600">Compare different debugging approaches and catch edge cases faster</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Architecture</h4>
                <p className="text-sm text-slate-600">Design better systems with consensus from multiple AI models</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Learning</h4>
                <p className="text-sm text-slate-600">Understand concepts faster with explanations from different AI perspectives</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Benefits */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-6">
              Why developers choose Polydev
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Join thousands of developers who have eliminated single-model bias and improved their code quality.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Catch More Edge Cases</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Different AI models excel at different types of analysis. Get comprehensive coverage by combining their strengths -
                      Claude for reasoning, GPT for creativity, Gemini for code understanding.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Reduce Development Time</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Stop switching between different AI tools and platforms. Get all perspectives in one place,
                      reducing context switching and improving your development velocity by up to 40%.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Stay in Flow State</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Native editor integrations mean no browser tabs, no copy-pasting, and no workflow interruptions.
                      Get AI perspectives directly in your IDE where you're already working.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-500/20 rounded-full blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-violet-500/20 rounded-full blur-xl"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold mb-6">Success Stories</h3>
                <div className="space-y-6">
                  <blockquote className="border-l-4 border-orange-500 pl-4">
                    <p className="text-slate-300 mb-2">
                      "Finally! I was switching between ChatGPT and Claude constantly.
                      Polydev saves me hours and catches issues I would have missed. Game changer."
                    </p>
                    <cite className="text-orange-400 text-sm">- Alex Chen, Fullstack Developer</cite>
                  </blockquote>
                  <blockquote className="border-l-4 border-violet-500 pl-4">
                    <p className="text-slate-300 mb-2">
                      "Used it to debug a memory leak that had me stuck for days.
                      Three different models gave me three different approaches - one finally worked!"
                    </p>
                    <cite className="text-violet-400 text-sm">- Sarah Martinez, Backend Engineer</cite>
                  </blockquote>
                  <blockquote className="border-l-4 border-emerald-500 pl-4">
                    <p className="text-slate-300 mb-2">
                      "The Claude Code integration is incredible. I get multiple perspectives
                      without leaving VS Code. My code reviews are so much better now."
                    </p>
                    <cite className="text-emerald-400 text-sm">- Jamie Park, Senior Developer</cite>
                  </blockquote>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-gradient-to-br from-orange-50 to-violet-50 border-t border-slate-200">
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