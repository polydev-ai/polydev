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
      subtitle: 'Venture into uncharted solutions with multiple AI perspectives guiding your path.'
    }
  },
  {
    id: 'pragmatist',
    name: '🎯 The Pragmatist',
    theme: {
      gradient: 'from-orange-600 via-orange-500 to-violet-600',
      bg: 'from-slate-50 via-white to-orange-50/30',
      cta: 'Get It Done',
      subtitle: 'Query multiple language models simultaneously within your existing development environment.'
    }
  },
  {
    id: 'visionary',
    name: '🚀 The Visionary',
    theme: {
      gradient: 'from-emerald-600 via-teal-500 to-cyan-600',
      bg: 'from-emerald-50 via-teal-50 to-cyan-50/30',
      cta: 'Shape the Future',
      subtitle: 'Transform your development workflow with revolutionary multi-model intelligence.'
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

function TypewriterText({ text, delay = 30, onComplete, startDelay = 0, className = '' }: { text: string; delay?: number; onComplete?: () => void; startDelay?: number; className?: string }) {
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

function DynamicMultiProblemShowcase() {
  const [currentProblemSet, setCurrentProblemSet] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  const problemSets = [
    {
      problems: [
        {
          type: "React Hook Issue",
          color: "red",
          title: "useEffect Dependencies",
          code: "useEffect(() => {\n  fetch(`/api/users/${userId}`)\n    .then(setUser)\n}, []) // Missing dependency",
          error: "⚠ Infinite re-render detected"
        },
        {
          type: "SQL Performance",
          color: "amber",
          title: "Slow Database Query",
          code: "SELECT * FROM users\nWHERE created_at > '2024'\nORDER BY name;",
          error: "⚠ Query taking 2.3s"
        },
        {
          type: "Memory Leak",
          color: "orange",
          title: "Interval Cleanup Missing",
          code: "setInterval(() => {\n  updateData();\n}, 1000);",
          error: "⚠ Memory usage increasing"
        }
      ],
      responses: [
        { model: "Claude 4.1 Opus", company: "Anthropic", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/anthropic.svg", solution: "Add dependency array: useEffect(() => {...}, [userId])", delay: 500 },
        { model: "GPT-5", company: "OpenAI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/openai.svg", solution: "CREATE INDEX idx_users_created ON users(created_at, name);", delay: 1200 },
        { model: "Gemini 2.5 Pro", company: "Google AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/google.svg", solution: "const cleanup = () => clearInterval(timer); useEffect(() => cleanup, []);", delay: 1900 },
        { model: "Grok 4", company: "xAI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/x.svg", solution: "Use custom hook: const { data, cleanup } = useAsyncData(url, deps);", delay: 2600 },
        { model: "Claude 4 Sonnet", company: "Anthropic", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/anthropic.svg", solution: "Consider useCallback for expensive operations: useCallback(() => fetchUser(id), [id])", delay: 3300 },
        { model: "Llama 3.3", company: "Meta", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/meta.svg", solution: "Implement debouncing: const debouncedFetch = useDebounce(fetchUser, 300);", delay: 4000 }
      ]
    },
    {
      problems: [
        {
          type: "API Design Issue",
          color: "purple",
          title: "REST Endpoint Structure",
          code: "app.get('/users/:id/posts/:postId/comments', \n  (req, res) => {\n    // Nested resource complexity\n  });",
          error: "⚠ Deep nesting anti-pattern"
        },
        {
          type: "Performance Bug",
          color: "blue",
          title: "N+1 Query Problem",
          code: "users.forEach(async user => {\n  const posts = await getUserPosts(user.id)\n  // N+1 queries executing\n});",
          error: "⚠ 1000+ database queries"
        },
        {
          type: "Security Vulnerability",
          color: "red",
          title: "SQL Injection Risk",
          code: "const query = `SELECT * FROM users \n  WHERE email = '${userEmail}'`;\nawait db.query(query);",
          error: "⚠ SQL injection vulnerability"
        }
      ],
      responses: [
        { model: "Claude 4.1 Opus", company: "Anthropic", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/anthropic.svg", solution: "Flatten API: GET /comments?userId=123&postId=456 with proper filtering", delay: 500 },
        { model: "GPT-5", company: "OpenAI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/openai.svg", solution: "Use DataLoader pattern: const posts = await dataLoader.loadMany(userIds);", delay: 1200 },
        { model: "Gemini 2.5 Pro", company: "Google AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/google.svg", solution: "Parameterized queries: await db.query('SELECT * FROM users WHERE email = ?', [email])", delay: 1900 },
        { model: "Grok 4", company: "xAI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/x.svg", solution: "GraphQL resolvers with field-level caching and batch loading", delay: 2600 },
        { model: "Claude 4 Sonnet", company: "Anthropic", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/anthropic.svg", solution: "ORM with eager loading: User.findAll({ include: [{ model: Post, include: [Comment] }] })", delay: 3300 },
        { model: "Llama 3.3", company: "Meta", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/meta.svg", solution: "Input validation middleware with sanitization and rate limiting", delay: 4000 }
      ]
    },
    {
      problems: [
        {
          type: "State Management",
          color: "green",
          title: "Redux Complexity",
          code: "const mapStateToProps = (state) => ({\n  user: state.auth.user,\n  loading: state.ui.loading,\n  error: state.api.errors.user\n});",
          error: "⚠ Props drilling across 15 components"
        },
        {
          type: "Build Performance",
          color: "yellow",
          title: "Webpack Bundle Size",
          code: "import * as lodash from 'lodash';\nimport moment from 'moment';\n// 2MB+ bundle size",
          error: "⚠ Bundle size: 2.1MB"
        },
        {
          type: "Testing Coverage",
          color: "indigo",
          title: "Missing Edge Cases",
          code: "it('should handle user login', () => {\n  expect(login('user', 'pass')).toBeTruthy();\n  // Missing error cases\n});",
          error: "⚠ 23% test coverage"
        }
      ],
      responses: [
        { model: "Claude 4.1 Opus", company: "Anthropic", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/anthropic.svg", solution: "Zustand with slices: const useAuth = create((set) => ({ user: null, setUser: (user) => set({ user }) }))", delay: 500 },
        { model: "GPT-5", company: "OpenAI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/openai.svg", solution: "Tree shaking: import { debounce } from 'lodash/debounce'; use date-fns instead of moment", delay: 1200 },
        { model: "Gemini 2.5 Pro", company: "Google AI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/google.svg", solution: "Property-based testing: fc.test(fc.record({email: fc.emailAddress()}), testLogin)", delay: 1900 },
        { model: "Grok 4", company: "xAI", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/x.svg", solution: "Context-based state: const { state, dispatch } = useContext(AppContext) with useReducer", delay: 2600 },
        { model: "Claude 4 Sonnet", company: "Anthropic", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/anthropic.svg", solution: "Dynamic imports: const Component = lazy(() => import('./HeavyComponent'))", delay: 3300 },
        { model: "Llama 3.3", company: "Meta", icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/meta.svg", solution: "Mutation testing with Stryker to find untested edge cases and improve coverage", delay: 4000 }
      ]
    }
  ]

  useEffect(() => {
    setIsMounted(true)
    const interval = setInterval(() => {
      setCurrentProblemSet((prev) => (prev + 1) % problemSets.length)
    }, 12000) // Change problem set every 12 seconds
    return () => clearInterval(interval)
  }, [])

  if (!isMounted) return null

  const currentSet = problemSets[currentProblemSet]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {/* Left Column - Multiple Problems with Cycling */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          <TypewriterText
            text={`Active Problems (Set ${currentProblemSet + 1}/${problemSets.length})`}
            delay={50}
            key={`problems-header-${currentProblemSet}`}
          />
        </h3>

        {currentSet.problems.map((problem, index) => (
          <div key={`${currentProblemSet}-${index}`} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className={`bg-${problem.color}-50 px-4 py-3 border-b border-${problem.color}-100`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 bg-${problem.color}-500 rounded-full animate-pulse`}></div>
                <span className={`text-sm font-medium text-${problem.color}-700`}>
                  <TypewriterText
                    text={problem.type}
                    delay={30}
                    startDelay={index * 200}
                    key={`${currentProblemSet}-${index}-type`}
                  />
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="font-mono text-sm text-slate-800 whitespace-pre-line">
                <TypewriterText
                  text={problem.code}
                  delay={20}
                  startDelay={500 + index * 300}
                  key={`${currentProblemSet}-${index}-code`}
                />
              </div>
              <div className="mt-3 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                <TypewriterText
                  text={problem.error}
                  delay={40}
                  startDelay={1500 + index * 200}
                  key={`${currentProblemSet}-${index}-error`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Center Column - Enhanced Engine with Light Beams */}
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center relative overflow-hidden">
            {/* Pulsing core */}
            <div className="absolute inset-2 bg-white rounded-full opacity-20 animate-pulse"></div>
            <svg className="w-10 h-10 text-white z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {/* Light beam effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-spin"></div>
          </div>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">
            <TypewriterText text="Polydev Engine" delay={50} />
          </h4>
          <p className="text-sm text-slate-600">
            <TypewriterText text="Analyzing & routing problems" delay={30} startDelay={800} />
          </p>
        </div>

        {/* Enhanced Light Beam Animation */}
        <div className="relative">
          <svg width="150" height="300" viewBox="0 0 150 300" className="text-slate-300">
            <defs>
              <linearGradient id="beamGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#06B6D4" stopOpacity="1" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="beamGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Multiple beam paths */}
            <path d="M75 50 Q120 80 75 110" stroke="url(#beamGradient1)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDuration: '2s'}} />
            <path d="M75 80 Q120 110 75 140" stroke="url(#beamGradient2)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '0.5s', animationDuration: '2s'}} />
            <path d="M75 110 Q120 140 75 170" stroke="url(#beamGradient1)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '1s', animationDuration: '2s'}} />
            <path d="M75 140 Q120 170 75 200" stroke="url(#beamGradient2)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '1.5s', animationDuration: '2s'}} />
            <path d="M75 170 Q120 200 75 230" stroke="url(#beamGradient1)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '2s', animationDuration: '2s'}} />
            <path d="M75 200 Q120 230 75 260" stroke="url(#beamGradient2)" strokeWidth="3" fill="none" className="animate-pulse" style={{animationDelay: '2.5s', animationDuration: '2s'}} />

            {/* Data flow particles */}
            <circle r="3" fill="#8B5CF6" className="animate-ping" style={{animationDelay: '0s'}}>
              <animateMotion dur="3s" repeatCount="indefinite">
                <path d="M75 50 Q120 80 75 110" />
              </animateMotion>
            </circle>
            <circle r="2" fill="#06B6D4" className="animate-ping" style={{animationDelay: '1s'}}>
              <animateMotion dur="3s" repeatCount="indefinite">
                <path d="M75 110 Q120 140 75 170" />
              </animateMotion>
            </circle>
            <circle r="2" fill="#F59E0B" className="animate-ping" style={{animationDelay: '2s'}}>
              <animateMotion dur="3s" repeatCount="indefinite">
                <path d="M75 170 Q120 200 75 230" />
              </animateMotion>
            </circle>
          </svg>

          {/* Floating energy particles */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({length: 8}).map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full absolute animate-bounce`}
                style={{
                  top: `${20 + (i * 8)}%`,
                  left: `${30 + (i % 2 * 40)}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        </div>

        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-100 to-cyan-100 rounded-full px-4 py-2">
            <span className="text-sm font-medium text-slate-700">
              <TypewriterText text="6 models responding" delay={40} startDelay={2000} />
            </span>
          </div>
        </div>
      </div>

      {/* Right Column - Enhanced AI Model Responses (2 rows of 3) */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          <TypewriterText text="AI Perspectives" delay={50} />
        </h3>

        {/* First Row of Models */}
        <div className="space-y-4">
          {currentSet.responses.slice(0, 3).map((response, index) => (
            <div key={`${currentProblemSet}-response-${index}`} className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200">
                  <Image src={response.icon} alt={response.model} width={20} height={20} className="filter" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    <TypewriterText text={response.model} delay={30} startDelay={200 + index * 100} />
                  </div>
                  <div className="text-xs text-slate-500">
                    <TypewriterText text={response.company} delay={40} startDelay={500 + index * 100} />
                  </div>
                </div>
                <div className="ml-auto">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-400">typing</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-700 font-mono">
                <TypewriterText
                  text={response.solution}
                  delay={25}
                  startDelay={response.delay}
                  key={`${currentProblemSet}-solution-${index}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Second Row of Models */}
        <div className="space-y-4">
          {currentSet.responses.slice(3, 6).map((response, index) => (
            <div key={`${currentProblemSet}-response-${index + 3}`} className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200">
                  <Image src={response.icon} alt={response.model} width={20} height={20} className="filter" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    <TypewriterText text={response.model} delay={30} startDelay={200 + (index + 3) * 100} />
                  </div>
                  <div className="text-xs text-slate-500">
                    <TypewriterText text={response.company} delay={40} startDelay={500 + (index + 3) * 100} />
                  </div>
                </div>
                <div className="ml-auto">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-400">typing</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-700 font-mono">
                <TypewriterText
                  text={response.solution}
                  delay={25}
                  startDelay={response.delay}
                  key={`${currentProblemSet}-solution-${index + 3}`}
                />
              </div>
            </div>
          ))}
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
  const [isMounted, setIsMounted] = useState(false)
  const [currentPersonality, setCurrentPersonality] = useState(PERSONALITIES[1]) // Default to Pragmatist
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    fetchModelsDevStats().then(setModelStats)

    // Command palette keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const interval = setInterval(() => {
      setCurrentExample((prev) => {
        const next = (prev + 1) % CODE_EXAMPLES.length
        setTypingStates({}) // Reset typing states when changing examples
        return next
      })
    }, 12000)
    return () => clearInterval(interval)
  }, [isMounted])

  // Reveal-on-scroll animations for elements with the `observe` class
  useEffect(() => {
    if (!isMounted) return
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.observe'))
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [isMounted])

  const handleTypingComplete = (responseIndex: number) => {
    setTypingStates(prev => ({ ...prev, [responseIndex]: true }))
  }

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

      {/* Dynamic Multi-Problem AI Showcase */}
      <section className="relative py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 overflow-hidden">
        {/* Floating background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-cyan-400/20 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-24 h-24 bg-gradient-to-r from-orange-400/20 to-violet-400/20 rounded-full blur-xl animate-float-reverse"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Multiple Problems, <span className="bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">Multiple Perspectives</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Watch AI models solve different challenges simultaneously with diverse approaches
            </p>
          </div>

          {/* Enhanced Dynamic Multi-Problem Showcase */}
          <DynamicMultiProblemShowcase />

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl hover:from-purple-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              <span>Get perspectives on your problems</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Cost Workbench */}
      <section className="relative py-20 bg-white overflow-hidden">
        {/* Floating elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-orange-400/20 to-violet-400/20 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-16 h-16 bg-gradient-to-r from-purple-400/20 to-cyan-400/20 rounded-full blur-xl animate-float-reverse"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              True <span className="bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">Cost Transparency</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              No vendor lock-in. No hidden fees. Only pay for what you use across hundreds of models.
            </p>
          </div>

          {/* Interactive Workbench */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

            {/* Workbench Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Cost Calculator</h3>
                  <p className="text-slate-600 mt-1">Compare real costs across providers</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700 mb-1">$0</div>
                    <div className="text-sm text-slate-600">CLI Tools</div>
                    <div className="text-xs text-green-600 mt-1">Your existing auth</div>
                  </div>
                  <div className="w-px bg-slate-300 mx-4"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-700 mb-1">$12.50</div>
                    <div className="text-sm text-slate-600">Per query</div>
                    <div className="text-xs text-slate-500 mt-1">5 models, 2k tokens</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Controls */}
            <div className="p-8 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Models */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Models</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="text-orange-500" />
                      <div className="flex items-center gap-3 flex-1">
                        <Image src="https://models.dev/logos/openai.svg" alt="OpenAI" width={20} height={20} />
                        <span className="font-medium">GPT-4o</span>
                        <span className="text-sm text-slate-500 ml-auto">$0.60/1K</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="text-orange-500" />
                      <div className="flex items-center gap-3 flex-1">
                        <Image src="https://models.dev/logos/anthropic.svg" alt="Anthropic" width={20} height={20} />
                        <span className="font-medium">Claude 3.5</span>
                        <span className="text-sm text-slate-500 ml-auto">$1.50/1K</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="text-orange-500" />
                      <div className="flex items-center gap-3 flex-1">
                        <Image src="https://models.dev/logos/google.svg" alt="Google" width={20} height={20} />
                        <span className="font-medium">Gemini Pro</span>
                        <span className="text-sm text-slate-500 ml-auto">$0.25/1K</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Right Column: Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Query Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Max Tokens</label>
                      <input type="range" min="500" max="4000" defaultValue="2000" className="w-full" />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>500</span>
                        <span>2000</span>
                        <span>4000</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Temperature</label>
                      <input type="range" min="0" max="1" step="0.1" defaultValue="0.3" className="w-full" />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0.0</span>
                        <span>0.3</span>
                        <span>1.0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <button className="w-full bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-orange-600 hover:to-violet-600 transition-all duration-200">
                  Calculate Cost
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="relative py-16 bg-gradient-to-b from-white via-slate-50/30 to-white overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-gradient-to-br from-orange-100/30 to-violet-100/30 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-100/20 to-orange-100/20 rounded-full blur-3xl animate-float-reverse"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.01)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/30 mb-8 glass-enhanced hover:scale-105 transition-all duration-500">
              <span className="text-sm font-medium text-indigo-600">How it works</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Stop debugging{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent animate-gradient-advanced">
                alone
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get multiple perspectives on your code, right where you're already working
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-16 bg-white">
        <div className="container mx-auto px-6 relative z-10">

          {/* Modern Flow Layout */}
          <div className="relative max-w-5xl mx-auto mb-20">
            {/* Connecting Line */}
            <div className="absolute left-8 md:left-1/2 top-16 bottom-16 w-0.5 bg-gradient-to-b from-indigo-500/20 via-purple-500/40 to-pink-500/20 transform md:-translate-x-0.5"></div>

            {/* Flow Steps */}
            <div className="space-y-16">
              {/* Step 1 */}
              <div className="relative flex flex-col md:flex-row items-center">
                <div className="flex-1 md:pr-12 mb-8 md:mb-0">
                  <div className="md:text-right">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200/30 mb-4">
                      <span className="text-sm font-medium text-blue-600">Step 1</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">MCP auto-detects when you're stuck</h3>
                    <p className="text-gray-600 leading-relaxed">
                      When you're debugging or need help in Claude Code, Cursor, or Cline, your MCP client automatically sends context to Polydev. No manual requests—it just works when you need it.
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-2xl text-white shadow-lg">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
                    </svg>
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1 md:pl-12 mt-8 md:mt-0">
                  <div className="md:opacity-0">&nbsp;</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col md:flex-row items-center">
                <div className="flex-1 md:pr-12 mb-8 md:mb-0">
                  <div className="md:opacity-0">&nbsp;</div>
                </div>
                <div className="flex-shrink-0">
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-2xl text-white shadow-lg">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 3H9V9H3V3ZM15 3H21V9H15V3ZM3 15H9V21H3V15ZM13 15H14V16H13V15ZM15 15H16V16H15V15ZM13 17H14V18H13V17ZM15 17H16V18H15V17ZM17 13H18V14H17V13ZM19 13H20V14H19V13ZM17 15H18V16H17V15ZM19 15H20V16H19V15ZM21 15H22V21H16V20H21V15Z"/>
                    </svg>
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1 md:pl-12 mt-8 md:mt-0">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/30 mb-4">
                    <span className="text-sm font-medium text-purple-600">Step 2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Models analyze your actual code</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Each model sees your entire project context—your files, dependencies, recent changes. They understand what you're actually working on, not just your question.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col md:flex-row items-center">
                <div className="flex-1 md:pr-12 mb-8 md:mb-0">
                  <div className="md:text-right">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/30 mb-4">
                      <span className="text-sm font-medium text-green-600">Step 3</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Compare and choose the best approach</h3>
                    <p className="text-gray-600 leading-relaxed">
                      See different solutions side by side. One model might catch an edge case another missed. Pick the approach that makes the most sense for your situation.
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-2xl text-white shadow-lg">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C12.8 2 13.5 2.7 13.5 3.5S12.8 5 12 5 10.5 4.3 10.5 3.5 11.2 2 12 2M21 9V7L19 8L21 9M15 4L16 2L14.5 1L13.5 3L15 4M13.5 21L14.5 23L16 22L15 20L13.5 21M21 15L19 16L21 17V15M9 4L10.5 3L9.5 1L8 2L9 4M3 9L5 8L3 7V9M3 15V17L5 16L3 15M8 20L9.5 21L10.5 23L9 22L8 20Z"/>
                    </svg>
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1 md:pl-12 mt-8 md:mt-0">
                  <div className="md:opacity-0">&nbsp;</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Benefits - Modern Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100/50 hover:shadow-lg transition-all duration-300">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Better solutions</h3>
              <p className="text-gray-600 text-sm">Different models excel at different things. Get the best of each without the hassle.</p>
            </div>
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100/50 hover:shadow-lg transition-all duration-300">
              <div className="text-3xl mb-4">🌊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay in flow</h3>
              <p className="text-gray-600 text-sm">No tab switching, no copy-pasting. Everything happens right in your editor.</p>
            </div>
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100/50 hover:shadow-lg transition-all duration-300">
              <div className="text-3xl mb-4">🧬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remembers context</h3>
              <p className="text-gray-600 text-sm">Picks up where you left off, even across sessions. No more explaining your project every time.</p>
            </div>
          </div>

          {/* Call to action */}
          <div className="text-center observe">
            <div className="inline-flex flex-col sm:flex-row items-center gap-6">
              <Link
                href="/docs"
                className="group relative btn-enhanced px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <span className="relative flex items-center gap-2">
                  Explore Documentation
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="group px-8 py-4 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-xl text-slate-700 font-semibold text-lg transition-all duration-500 hover:border-orange-300 hover:bg-white/80 hover:scale-105 shadow-lg hover:shadow-xl sophisticated-hover"
              >
                <span className="flex items-center gap-2">
                  Start Building
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Supported Editors */}
      <section className="relative py-16 bg-gradient-to-br from-orange-50/60 via-white/80 to-violet-50/60 overflow-hidden">
        {/* Sophisticated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-1/4 w-64 h-64 bg-gradient-to-br from-orange-200/20 to-violet-200/20 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-gradient-to-br from-violet-200/15 to-blue-200/15 rounded-full blur-3xl animate-float-reverse"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.008)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12 px-4 observe">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500/10 to-orange-500/10 border border-blue-200/30 mb-8 glass-enhanced hover:scale-105 transition-all duration-500">
              <span className="text-sm font-medium text-blue-600">Native Integration</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight stagger-fade-in">
              Zero-friction development{' '}
              <span className="bg-gradient-to-r from-blue-600 via-orange-600 to-violet-600 bg-clip-text text-transparent animate-gradient">
                workflow
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed stagger-fade-in">
              Execute multi-model queries directly within your IDE via MCP protocol integration—no context switching required
            </p>
          </div>

          {/* Enhanced editor grid */}
          <div className="relative max-w-5xl mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 lg:gap-10">
              {SUPPORTED_EDITORS.map((editor, index) => (
                <div key={index} className="group observe" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="relative">
                    {/* Sophisticated glow effect */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 via-violet-500/20 to-blue-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative h-20 w-20 p-4 rounded-3xl glass-enhanced border border-white/40 hover:border-orange-200/60 transition-all duration-500 hover:scale-110 hover:shadow-2xl shadow-lg sophisticated-hover magnetic-hover">
                      <Image src={editor.logo} alt="Editor logo" fill className="object-contain p-1 transition-transform duration-300 group-hover:scale-110" />

                      {/* Subtle inner glow */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>

                    {/* Floating tooltip */}
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                      <div className="bg-slate-900/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                        Supported
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Enhanced "more" indicator */}
              <div className="group observe" style={{ animationDelay: `${SUPPORTED_EDITORS.length * 0.1}s` }}>
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-violet-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative h-20 w-20 p-4 rounded-3xl glass-enhanced border-2 border-dashed border-orange-300/60 hover:border-orange-400/80 transition-all duration-500 hover:scale-110 flex items-center justify-center sophisticated-hover">
                    <div className="relative">
                      <svg className="w-8 h-8 text-orange-500 group-hover:text-orange-600 transition-colors animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>

                      {/* Rotating glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-violet-400/30 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-spin-slow"></div>
                    </div>
                  </div>

                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                    <div className="bg-slate-900/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                      More coming
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced protocol info */}
          <div className="text-center mt-12 observe">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl glass-enhanced border border-orange-200/30 hover:border-orange-300/50 transition-all duration-500 hover:scale-105">
              <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-violet-500 rounded-full animate-pulse"></div>
              <span className="text-slate-600">
                And many more through our{' '}
                <Link
                  href="/docs/integrations"
                  className="font-semibold bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent hover:from-orange-700 hover:to-violet-700 transition-all duration-300"
                >
                  universal MCP protocol
                </Link>
              </span>
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Free CLI Usage Section */}
      <section className="relative py-4 bg-gradient-to-br from-white via-slate-50/20 to-white overflow-hidden">
        {/* Enhanced background elements with more sophistication */}
        <div className="absolute inset-0">
          <div className="absolute top-16 left-1/4 w-80 h-80 bg-gradient-to-br from-green-100/25 to-blue-100/25 rounded-full blur-3xl animate-sophisticated-float"></div>
          <div className="absolute bottom-16 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-100/20 to-violet-100/20 rounded-full blur-3xl animate-float-reverse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-emerald-200/10 to-cyan-200/10 rounded-full blur-2xl animate-float-delayed"></div>
          {/* Sophisticated grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.008)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center mb-8 observe">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-200/30 mb-8 glass-enhanced hover:scale-105 transition-all duration-500">
              <span className="text-sm font-medium text-green-600">Zero Cost Integration</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-6 leading-tight">
              Get perspectives{' '}
              <span className="bg-gradient-to-r from-green-600 via-orange-600 to-violet-600 bg-clip-text text-transparent animate-gradient">
                without spending anything
              </span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Already using Claude Code, Cursor, or other development tools? Get multi-model perspectives completely free using your existing CLI tools—no new API keys needed.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Benefits */}
            <div className="space-y-8">
              <div className="group relative glass-enhanced rounded-2xl p-6 hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-500 sophisticated-hover">
                {/* Floating gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-emerald-50/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-emerald-400/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-green-700 transition-colors">Use Your Existing CLI Tools</h3>
                    <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">
                      Already authenticated with Claude Code, Cursor, or Cline? Polydev routes requests through them automatically—using your existing credits.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative glass-enhanced rounded-2xl p-6 hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500 sophisticated-hover">
                {/* Floating gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">Flexible API Access</h3>
                    <p className="text-slate-600 leading-relaxed mb-4 group-hover:text-slate-700 transition-colors">
                      No juggling API keys. Use CLI tools for free, Polydev credits for convenience, or your own keys for control.
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center hover:bg-green-100 transition-colors group-hover:scale-105 transform duration-300">
                        <div className="font-semibold text-green-700">CLI Tools</div>
                        <div className="text-green-600">Free</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center hover:bg-orange-100 transition-colors group-hover:scale-105 transform duration-300">
                        <div className="font-semibold text-orange-700">Credits</div>
                        <div className="text-orange-600">Pay-as-go</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center hover:bg-blue-100 transition-colors group-hover:scale-105 transform duration-300">
                        <div className="font-semibold text-blue-700">Your Keys</div>
                        <div className="text-blue-600">Full control</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative glass-enhanced rounded-2xl p-6 hover:shadow-2xl hover:shadow-orange-100/50 transition-all duration-500 sophisticated-hover">
                {/* Floating gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-violet-50/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                <div className="relative flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-violet-400/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-orange-700 transition-colors">Simple Credit System</h3>
                    <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">
                      Access all 340+ models with unified billing. Pay only for what you use. Start with 100 free requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - CLI Example */}
            <div className="group relative">
              {/* Sophisticated glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-slate-500/20 via-green-500/20 to-blue-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden glass-enhanced hover:shadow-3xl transition-all duration-500">
                {/* Enhanced terminal header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping opacity-20"></div>
                      </div>
                      <div className="relative">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-yellow-400 rounded-full animate-pulse opacity-30"></div>
                      </div>
                      <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                        <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-pulse opacity-30"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-slate-300 text-sm font-mono">Terminal</span>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/60">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-slate-400">Live</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced terminal content */}
                <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-mono text-sm relative overflow-hidden">
                  {/* Code syntax highlighting effect */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 opacity-60"></div>

                  <div className="space-y-3 leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-semibold">$</span>
                      <span className="text-green-400">polydev perspectives "optimize this query"</span>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Using Claude Code CLI (authenticated)
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Using Cursor API (authenticated)
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Fallback to Polydev credits for additional models
                    </div>
                    <div className="text-slate-300 flex items-center gap-2 mt-4">
                      <span className="text-lg">📊</span>
                      Getting perspectives from:
                    </div>
                    <div className="ml-6 space-y-2">
                      <div className="text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></span>
                        Claude Opus 4 <span className="text-green-400">(via Claude Code)</span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                        GPT-5 <span className="text-green-400">(via Cursor)</span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></span>
                        Gemini 2.5 Pro <span className="text-orange-400">(via Polydev)</span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                        DeepSeek V3 <span className="text-orange-400">(via Polydev)</span>
                      </div>
                    </div>
                    <div className="text-blue-400 flex items-center gap-2 mt-4 bg-blue-900/20 rounded-lg px-3 py-2">
                      <span className="text-lg">💸</span>
                      <span className="font-semibold">Cost: $0.00</span>
                      <span className="text-slate-400">(using existing CLI authentication)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Path Layout - Choose Your Adventure */}
          <div className="mt-16 max-w-6xl mx-auto relative">
            {/* Dynamic connecting paths */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 800 400" fill="none">
                <path d="M150 200 Q400 100 650 200" stroke="url(#pathGradient)" strokeWidth="2" strokeDasharray="5,5" opacity="0.3"/>
                <path d="M150 200 Q400 300 650 200" stroke="url(#pathGradient2)" strokeWidth="2" strokeDasharray="5,5" opacity="0.3"/>
                <defs>
                  <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981"/>
                    <stop offset="50%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#f97316"/>
                  </linearGradient>
                  <linearGradient id="pathGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6"/>
                    <stop offset="50%" stopColor="#ec4899"/>
                    <stop offset="100%" stopColor="#f59e0b"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Staggered Interactive Cards */}
            <div className="relative z-10 space-y-8">
              {/* Path 1: Expert Developer */}
              <div className="flex items-center group">
                <div className="w-2/3 pr-8">
                  <div className="relative p-8 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-green-50/80 border border-emerald-200/50 hover:border-emerald-300/70 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm">
                    {/* Animated badge */}
                    <div className="absolute -top-3 left-6 px-4 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-lg">
                      ⚡ INSTANT
                    </div>
                    {/* Floating accent */}
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-100 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-300"></div>

                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-300">
                        <span className="text-2xl">🛠️</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">I have Claude Code / Cursor / Cline</h3>
                        <p className="text-slate-600 mb-4">Zero setup. Start getting multiple model perspectives immediately using your existing CLI authentication.</p>
                        <div className="flex items-center gap-2 text-sm text-emerald-700 mb-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            Works in 30 seconds
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            $0 cost
                          </span>
                        </div>
                        <button className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold group-hover:scale-105">
                          Quick MCP Setup →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-1/3 text-center opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="text-sm text-slate-500 font-medium">Expert Path</div>
                </div>
              </div>

              {/* Path 2: Curious Explorer */}
              <div className="flex items-center group justify-end">
                <div className="w-1/3 text-center opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="text-sm text-slate-500 font-medium">Discovery Mode</div>
                </div>
                <div className="w-2/3 pl-8">
                  <div className="relative p-8 rounded-2xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 border border-blue-200/50 hover:border-blue-300/70 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm">
                    {/* Animated badge */}
                    <div className="absolute -top-3 right-6 px-4 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      FREE
                    </div>
                    {/* Floating accent */}
                    <div className="absolute -left-4 -top-4 w-16 h-16 bg-blue-100 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-300"></div>

                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-300">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">I want to explore first</h3>
                        <p className="text-slate-600 mb-4">Get 100 free requests across all 340+ models. No credit card, no commitments, just pure experimentation.</p>
                        <div className="flex items-center gap-2 text-sm text-blue-700 mb-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            100 free comparisons
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            All models included
                          </span>
                        </div>
                        <button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold group-hover:scale-105">
                          Start Free Trial →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Path 3: Power User */}
              <div className="flex items-center group">
                <div className="w-2/3 pr-8">
                  <div className="relative p-8 rounded-2xl bg-gradient-to-r from-orange-50/80 to-violet-50/80 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm">
                    {/* Animated badge */}
                    <div className="absolute -top-3 left-6 px-4 py-1 bg-gradient-to-r from-orange-500 to-violet-500 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      UNLIMITED
                    </div>
                    {/* Floating accent */}
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-r from-orange-100 to-violet-100 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-300"></div>

                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-300">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">I need all the models</h3>
                        <p className="text-slate-600 mb-4">Production-ready access to 340+ models with credits that work across every provider. No subscription juggling.</p>
                        <div className="flex items-center gap-2 text-sm text-orange-700 mb-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            Pay only for usage
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            Sub-second responses
                          </span>
                        </div>
                        <button className="bg-gradient-to-r from-orange-500 to-violet-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold group-hover:scale-105">
                          Browse All Models →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-1/3 text-center opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-r from-orange-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-slate-500 font-medium">Power Mode</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Deep Dive */}
      <section className="relative py-10 bg-gradient-to-br from-slate-50/60 via-white/80 to-slate-100/60 overflow-hidden">
        {/* Enhanced background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-1/3 w-96 h-96 bg-gradient-to-br from-slate-200/20 to-orange-200/20 rounded-full blur-3xl animate-sophisticated-float"></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br from-violet-200/15 to-blue-200/15 rounded-full blur-3xl animate-float-reverse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br from-orange-100/10 to-violet-100/10 rounded-full blur-2xl animate-float-slow"></div>
          {/* Tech-themed grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(51,65,85,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.008)_1px,transparent_1px)] bg-[size:100px_100px] opacity-40"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12 observe">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-slate-500/10 to-orange-500/10 border border-slate-200/50 mb-8 glass-enhanced hover:scale-105 transition-all duration-500">
              <span className="text-sm font-medium text-slate-600">Advanced Technology</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-6 leading-tight stagger-fade-in">
              Built for{' '}
              <span className="bg-gradient-to-r from-slate-700 via-orange-600 to-violet-600 bg-clip-text text-transparent animate-gradient-advanced">
                modern development workflows
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed stagger-fade-in">
              Polydev leverages cutting-edge technologies to deliver seamless multi-model experiences directly in your development environment.
            </p>
          </div>

          {/* Central Hub Architecture Showcase */}
          <div className="relative max-w-6xl mx-auto">
            {/* Central Polydev Hub */}
            <div className="relative flex items-center justify-center mb-16">
              <div className="relative group">
                {/* Orbiting Connection Lines */}
                <div className="absolute inset-0 animate-spin" style={{animationDuration: '20s'}}>
                  <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/2 w-px h-32 bg-gradient-to-t from-purple-300/50 to-transparent transform -translate-x-0.5"></div>
                    <div className="absolute bottom-0 left-1/2 w-px h-32 bg-gradient-to-b from-emerald-300/50 to-transparent transform -translate-x-0.5"></div>
                    <div className="absolute left-0 top-1/2 h-px w-32 bg-gradient-to-l from-orange-300/50 to-transparent transform -translate-y-0.5"></div>
                    <div className="absolute right-0 top-1/2 h-px w-32 bg-gradient-to-r from-blue-300/50 to-transparent transform -translate-y-0.5"></div>
                  </div>
                </div>

                {/* Central Hub */}
                <div className="relative w-32 h-32 bg-gradient-to-br from-slate-900 via-purple-900 to-orange-900 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500">
                  <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-full backdrop-blur-sm"></div>
                  <div className="relative text-white text-2xl font-bold">PD</div>

                  {/* Pulsing rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-ping" style={{animationDuration: '3s'}}></div>
                  <div className="absolute inset-0 rounded-full border-2 border-orange-400/20 animate-ping" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>

            {/* Floating Feature Satellites */}
            <div className="relative">
              {/* MCP Architecture - Top */}
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 group">
                <div className="relative">
                  <div className="w-64 bg-gradient-to-r from-purple-50/90 to-indigo-50/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/50 hover:border-purple-300/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">MCP Integration</h4>
                        <div className="text-xs text-purple-600">Zero-config setup</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">Seamlessly plugs into Claude Code, Cursor, and Cline without any API key management.</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Native</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Instant</span>
                    </div>
                  </div>
                  {/* Connection dot */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-3 h-3 bg-purple-400 rounded-full shadow-lg"></div>
                </div>
              </div>

              {/* Memory System - Left */}
              <div className="absolute top-16 -left-72 group">
                <div className="relative">
                  <div className="w-64 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200/50 hover:border-emerald-300/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Smart Memory</h4>
                        <div className="text-xs text-emerald-600">End-to-end encrypted</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">Remembers your project context across sessions while keeping everything private.</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Private</span>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">SOC 2</span>
                    </div>
                  </div>
                  {/* Connection dot */}
                  <div className="absolute top-1/2 right-0 transform translate-x-full -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-lg"></div>
                </div>
              </div>

              {/* Speed Engine - Right */}
              <div className="absolute top-16 -right-72 group">
                <div className="relative">
                  <div className="w-64 bg-gradient-to-r from-orange-50/90 to-red-50/90 backdrop-blur-sm rounded-2xl p-6 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white text-xl">⚡</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Speed Engine</h4>
                        <div className="text-xs text-orange-600">1.7s avg response</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">Multiple models responding faster than single queries through intelligent routing.</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Edge</span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Cached</span>
                    </div>
                  </div>
                  {/* Connection dot */}
                  <div className="absolute top-1/2 left-0 transform -translate-x-full -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full shadow-lg"></div>
                </div>
              </div>

              {/* Model Ecosystem - Bottom */}
              <div className="absolute top-48 left-1/2 transform -translate-x-1/2 group">
                <div className="relative">
                  {/* Connection dot */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-3 h-3 bg-blue-400 rounded-full shadow-lg"></div>
                  <div className="w-80 bg-gradient-to-r from-blue-50/90 to-cyan-50/90 backdrop-blur-sm rounded-2xl p-6 border border-blue-200/50 hover:border-blue-300/70 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white text-xl">🌐</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">340+ Model Ecosystem</h4>
                        <div className="text-xs text-blue-600">OpenAI • Anthropic • Google • xAI • More</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-4">Access every major model through one unified interface. No subscription juggling.</p>

                    {/* Model Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="h-8 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center text-xs font-medium text-green-700">GPT</div>
                      <div className="h-8 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center text-xs font-medium text-purple-700">Claude</div>
                      <div className="h-8 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center text-xs font-medium text-blue-700">Gemini</div>
                      <div className="h-8 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg flex items-center justify-center text-xs font-medium text-orange-700">+337</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="relative group glass-ultra rounded-3xl p-10 shadow-2xl border border-slate-200/60 hover:shadow-3xl transition-all duration-700 sophisticated-hover observe">
            {/* Sophisticated background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-white/50 to-orange-50/30 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="relative">
              <h3 className="text-3xl font-bold text-slate-900 text-center mb-12 group-hover:text-slate-800 transition-colors">
                When coding gets{' '}
                <span className="bg-gradient-to-r from-slate-700 to-orange-600 bg-clip-text text-transparent">
                  complicated
                </span>
              </h3>

              {/* Modern Hexagonal Layout */}
              <div className="relative max-w-4xl mx-auto">
                {/* Central connector */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-100/30 to-violet-100/30 backdrop-blur-sm"></div>
                </div>

                {/* Hexagonal arrangement */}
                <div className="grid grid-cols-2 gap-12 lg:gap-16">
                  {/* Live Bug Hunt Workflow */}
                  <div className="relative group p-6 rounded-2xl bg-gradient-to-br from-red-50/80 to-pink-50/80 border border-red-100/50 hover:border-red-200/70 transition-all duration-300 hover:scale-105">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-mono">LIVE DEMO</div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Bug Hunt Workflow</h4>
                    <div className="text-xs text-slate-500 mb-2 font-mono">Step 1: Analyze stack trace</div>
                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs mb-3 font-mono">
                      <span className="text-red-400">Error:</span> Cannot read property 'id' of undefined
                    </div>
                    <p className="text-xs text-slate-600">Three debugging strategies running simultaneously</p>
                  </div>

                  {/* Code Surgery Demo */}
                  <div className="relative group p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-cyan-50/80 border border-blue-100/50 hover:border-blue-200/70 transition-all duration-300 hover:scale-105">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono">REFACTOR</div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Legacy Refactor</h4>
                    <div className="text-xs text-slate-500 mb-2 font-mono">Target: 2000-line component</div>
                    <div className="grid grid-cols-3 gap-1 mb-3">
                      <div className="h-2 bg-yellow-200 rounded"></div>
                      <div className="h-2 bg-orange-200 rounded"></div>
                      <div className="h-2 bg-red-200 rounded"></div>
                    </div>
                    <p className="text-xs text-slate-600">Compare decomposition approaches</p>
                  </div>

                  {/* Architecture Lab */}
                  <div className="relative group p-6 rounded-2xl bg-gradient-to-br from-purple-50/80 to-indigo-50/80 border border-purple-100/50 hover:border-purple-200/70 transition-all duration-300 hover:scale-105">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-mono">SCALING</div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Architecture Lab</h4>
                    <div className="text-xs text-slate-500 mb-2 font-mono">Challenge: 100k RPS → 1M RPS</div>
                    <div className="flex gap-1 mb-3">
                      <div className="flex-1 h-4 bg-gradient-to-r from-purple-200 to-indigo-200 rounded flex items-center justify-center text-xs">DB</div>
                      <div className="flex-1 h-4 bg-gradient-to-r from-indigo-200 to-purple-200 rounded flex items-center justify-center text-xs">Cache</div>
                    </div>
                    <p className="text-xs text-slate-600">Trade-off analysis across patterns</p>
                  </div>

                  {/* Learning Simulator */}
                  <div className="relative group p-6 rounded-2xl bg-gradient-to-br from-green-50/80 to-emerald-50/80 border border-green-100/50 hover:border-green-200/70 transition-all duration-300 hover:scale-105">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-mono">LEARN</div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Learning Path</h4>
                    <div className="text-xs text-slate-500 mb-2 font-mono">Topic: React Server Components</div>
                    <div className="space-y-1 mb-3">
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Beginner explanation
                      </div>
                      <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Practical examples
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">Adaptive explanations by skill level</p>
                  </div>
                </div>
              </div>
          </div>
        </div>
        </div>
      </section>

      {/* Developer Benefits */}
      <section className="py-4 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
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
                      Different models excel at different types of analysis. Get comprehensive coverage by combining their strengths -
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
                      Stop switching between different tools and platforms. Get all perspectives in one place,
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
                      Get model perspectives directly in your IDE where you're already working.
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

      <section className="py-4 bg-gradient-to-br from-orange-50 via-white to-violet-50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl">Give your editor a safety net</h2>
          <p className="mt-6 text-xl text-slate-600">
            Never get blocked by single model limitations again.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            {isMounted ? (
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth'}
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/25 transition-all duration-300 hover:shadow-orange-500/40 hover:scale-105"
              >
                {isAuthenticated ? 'Open Dashboard' : 'Create Workspace'}
              </Link>
            ) : (
              <div className="rounded-full bg-gradient-to-r from-orange-500 to-violet-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/25">
                Create Workspace
              </div>
            )}
            <Link
              href="/pricing"
              className="group rounded-full border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-slate-700 transition-all duration-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">⌘K</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Polydev Command Palette</h3>
              <button
                onClick={() => setShowCommandPalette(false)}
                className="ml-auto w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type a command or ask a question..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 placeholder-slate-500"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Quick Actions</div>
              <div className="space-y-2">
                {[
                  { icon: '🔍', title: 'Code Review', desc: 'Get multiple perspectives on code quality' },
                  { icon: '🐛', title: 'Debug Issue', desc: 'Find and fix bugs with AI assistance' },
                  { icon: '⚡', title: 'Optimize Performance', desc: 'Improve code speed and efficiency' },
                  { icon: '📚', title: 'Explain Code', desc: 'Understand complex code patterns' },
                  { icon: '🧪', title: 'Generate Tests', desc: 'Create comprehensive test suites' },
                  { icon: '🔄', title: 'Refactor Code', desc: 'Improve code structure and readability' }
                ].map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <span className="text-xl">{action.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 group-hover:text-purple-700">{action.title}</div>
                      <div className="text-sm text-slate-500">{action.desc}</div>
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Enter</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Press <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> to close</span>
                <span>Press <kbd className="px-2 py-1 bg-white border rounded">↑↓</kbd> to navigate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Hint */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 max-w-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⌘K</span>
            </div>
            <div>
              <div className="font-medium text-slate-900 text-sm">Try the Command Palette</div>
              <div className="text-xs text-slate-500">Press ⌘K to get started</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
