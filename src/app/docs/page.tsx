'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { marked } from 'marked'
import { ChevronLeft, ChevronRight, Copy, Check, BookOpen, ExternalLink, Zap, Shield, Code2 } from 'lucide-react'

interface DocSection {
  id: string
  title: string
  items: {
    title: string
    href: string
    description?: string
    filePath?: string
  }[]
}

interface CopyButtonProps {
  text: string
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-4 right-4 p-2.5 rounded-lg bg-white hover:bg-gray-50 transition-colors duration-200 opacity-0 group-hover:opacity-100 border border-gray-200 shadow-sm"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4 text-gray-600" />
      )}
    </button>
  )
}

// Global cache for docs content to prevent reprocessing
const docsCache = {
  content: new Map<string, string>(),
  processedMarkdown: new Map<string, string>(),
  tableOfContents: new Map<string, { id: string; text: string; level: number }[]>(),
  timestamps: new Map<string, number>(),
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes for content
}

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [activeItem, setActiveItem] = useState('introduction')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([])
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Memoized doc sections to prevent recreation on every render
  const docSections: DocSection[] = useMemo(() => [
    {
      id: 'getting-started',
      title: 'Getting Started',
      items: [
        { title: 'What is Polydev?', href: '#what-is-polydev', filePath: '/docs/intro/what-is-polydev.md' },
        { title: 'Quick Start', href: '#quick-start', filePath: '/docs/intro/quick-start.md' },
        { title: 'Installation', href: '#installation', filePath: '/docs/intro/installation.md' }
      ]
    },
    {
      id: 'configuration',
      title: 'Configuration',
      items: [
        { title: 'Environment Setup', href: '#environment', filePath: '/docs/config/environment.md' },
        { title: 'Authentication', href: '#authentication', filePath: '/docs/config/authentication.md' },
        { title: 'User Preferences', href: '#preferences', filePath: '/docs/config/preferences.md' }
      ]
    },
    {
      id: 'providers',
      title: 'AI Providers',
      items: [
        { title: 'Provider Overview', href: '#providers-overview', filePath: '/docs/providers/index.md' },
        { title: 'OpenAI', href: '#openai', filePath: '/docs/providers/api-providers/openai.md' },
        { title: 'Anthropic', href: '#anthropic', filePath: '/docs/providers/api-providers/anthropic.md' },
        { title: 'Google AI (Gemini)', href: '#google-ai', filePath: '/docs/providers/api-providers/google-ai.md' },
        { title: 'Groq', href: '#groq', filePath: '/docs/providers/api-providers/groq.md' },
        { title: 'OpenRouter', href: '#openrouter', filePath: '/docs/providers/api-providers/openrouter.md' },
        { title: 'Claude Code CLI', href: '#claude-code', filePath: '/docs/providers/cli-providers/claude-code.md' },
        { title: 'Continue.dev', href: '#continue', filePath: '/docs/providers/cli-providers/continue.md' },
        { title: 'Cursor', href: '#cursor', filePath: '/docs/providers/cli-providers/cursor.md' },
        { title: 'Cline (VS Code)', href: '#cline', filePath: '/docs/providers/cli-providers/cline.md' }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      items: [
        { title: 'Perspectives (multi-model)', href: '#perspectives', filePath: '/docs/features/perspectives/index.md' },
        { title: 'Project Memory', href: '#memory', filePath: '/docs/features/memory/index.md' },
        { title: 'Intelligent Fallback', href: '#fallback', filePath: '/docs/features/fallback/index.md' },
        { title: 'Analytics', href: '#analytics', filePath: '/docs/features/analytics/index.md' },
        { title: 'Security', href: '#security', filePath: '/docs/features/security/index.md' }
      ]
    },
    {
      id: 'mcp',
      title: 'MCP Integration',
      items: [
        { title: 'Overview', href: '#mcp-overview', filePath: '/docs/mcp/overview.md' },
        { title: 'Server Setup', href: '#mcp-server', filePath: '/docs/mcp/server-setup.md' },
        { title: 'Claude Desktop', href: '#mcp-claude-desktop', filePath: '/docs/mcp/clients/claude-desktop.md' },
        { title: 'Cline (VS Code)', href: '#mcp-cline', filePath: '/docs/mcp/clients/cline.md' },
        { title: 'Cursor', href: '#mcp-cursor', filePath: '/docs/mcp/clients/cursor.md' },
        { title: 'Continue', href: '#mcp-continue', filePath: '/docs/mcp/clients/continue.md' },
        { title: 'Gemini CLI', href: '#mcp-gemini', filePath: '/docs/mcp/clients/gemini-cli.md' }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      items: [
        { title: 'API Overview', href: '#api-overview', filePath: '/docs/api-reference/index.md' },
        { title: 'Perspectives API', href: '#perspectives-api', filePath: '/docs/api-reference/perspectives/index.md' },
        { title: 'Chat Completions', href: '#chat-api', filePath: '/docs/api-reference/chat/index.md' },
        { title: 'Models', href: '#models-api', filePath: '/docs/api-reference/models/index.md' },
        { title: 'Webhooks', href: '#webhooks-api', filePath: '/docs/api-reference/webhooks/index.md' }
      ]
    }
  ], []) // Empty dependency array since docSections is static

  // Get current item index for navigation - memoized for performance
  const getCurrentItemIndex = useCallback(() => {
    for (let sectionIndex = 0; sectionIndex < docSections.length; sectionIndex++) {
      const section = docSections[sectionIndex]
      for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
        const item = section.items[itemIndex]
        if (activeItem === item.href.replace('#', '')) {
          return { sectionIndex, itemIndex, section, item }
        }
      }
    }
    return null
  }, [docSections, activeItem])

  // Memoized navigation items calculation
  const getNavigationItems = useCallback(() => {
    const current = getCurrentItemIndex()
    if (!current) return { prev: null, next: null }

    const allItems: Array<{ title: string, href: string, filePath?: string, section: string }> = []
    docSections.forEach(section => {
      section.items.forEach(item => {
        allItems.push({
          ...item,
          section: section.title
        })
      })
    })

    const currentIndex = allItems.findIndex(item =>
      activeItem === item.href.replace('#', '')
    )

    return {
      prev: currentIndex > 0 ? allItems[currentIndex - 1] : null,
      next: currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null
    }
  }, [getCurrentItemIndex, docSections, activeItem])

  // Enhanced markdown processing with caching: heading anchors + copy buttons for code
  const processMarkdownContent = useCallback((html: string) => {
    // Check cache first
    if (docsCache.processedMarkdown.has(html)) {
      return docsCache.processedMarkdown.get(html)!
    }
    // Add ids to h2/h3 for anchors
    const addIds = (s: string) =>
      s
        .replace(/<h2>([^<]+)<\/h2>/g, (_m, t) => {
          const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          return `<h2 id="${id}">${t}<a href="#${id}" class="anchor-link ml-2 text-gray-300 hover:text-gray-500 no-underline align-middle" aria-label="Link to section">#</a></h2>`
        })
        .replace(/<h3>([^<]+)<\/h3>/g, (_m, t) => {
          const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          return `<h3 id="${id}">${t}<a href="#${id}" class="anchor-link ml-2 text-gray-300 hover:text-gray-500 no-underline align-middle" aria-label="Link to section">#</a></h3>`
        })

    html = addIds(html)

    // Add copy buttons to code blocks and improve styling
    return html.replace(
      /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
      (match, attributes, code) => {
        const decodedCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")

        return `
          <div class="relative group my-8">
            <pre class="bg-gray-50 text-gray-900 rounded-2xl p-6 overflow-x-auto border border-gray-200 font-mono text-sm leading-relaxed shadow-sm hover:shadow-md transition-shadow duration-200"><code${attributes}>${code}</code></pre>
            <button class="copy-btn absolute top-4 right-4 p-2.5 rounded-lg bg-white hover:bg-gray-50 transition-colors duration-200 opacity-0 group-hover:opacity-100 border border-gray-200 shadow-sm" data-code="${decodedCode.replace(/"/g, '&quot;')}" title="Copy to clipboard">
              <svg class="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        `
      }
    )

    // Cache the result
    const result = addIds(html)
    docsCache.processedMarkdown.set(html, result)
    return result
  }, [])

  // After content mounts, enhance with code-tabs and collect TOC
  useEffect(() => {
    const container = document.getElementById('doc-content')
    if (!container) return

    // Build TOC from h2/h3
    const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLHeadingElement[]
    const tocItems = headings.map(h => ({ id: h.id, text: h.textContent || '', level: h.tagName === 'H2' ? 2 : 3 }))
    setToc(tocItems)

    // Append visible anchor links to headings if missing
    headings.forEach(h => {
      if (!h.id) {
        const id = (h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        if (id) h.id = id
      }
      if (!h.querySelector('a.anchor-link')) {
        const a = document.createElement('a')
        a.href = `#${h.id}`
        a.className = 'ml-2 text-gray-300 hover:text-gray-500 no-underline align-middle anchor-link'
        a.ariaLabel = 'Link to section'
        a.textContent = '#'
        h.appendChild(a)
      }
    })

    // Initialize simple code tabs
    const groups = container.querySelectorAll<HTMLElement>('.code-tabs')
    groups.forEach(group => {
      const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('.tab-button'))
      const panes = Array.from(group.querySelectorAll<HTMLElement>('pre[data-lang]'))
      const activate = (lang: string) => {
        panes.forEach(p => {
          p.style.display = p.dataset.lang === lang ? 'block' : 'none'
        })
        buttons.forEach(b => {
          if (b.dataset.lang === lang) b.classList.add('bg-slate-900', 'text-white')
          else b.classList.remove('bg-slate-900', 'text-white')
        })
      }
      // Default to first button
      const initial = buttons[0]?.dataset.lang || panes[0]?.dataset.lang || 'curl'
      activate(initial)
      buttons.forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.lang || initial)))
    })
  }, [content])

  // Optimized sample content with caching and lazy loading
  const getSampleContent = useCallback((itemId: string) => {
    // Check cache first
    if (docsCache.content.has(itemId)) {
      const cachedData = docsCache.content.get(itemId)!
      const timestamp = docsCache.timestamps.get(itemId) || 0
      if (Date.now() - timestamp < docsCache.CACHE_DURATION) {
        return cachedData
      }
    }
    const samples: Record<string, string> = {
      'what-is-polydev': `
# What is Polydev?

Get multiple AI perspectives when you're stuck. Simple as that.

When your agent hits a roadblock, Polydev queries several AI models simultaneously and gives you diverse solutions.

## How it works

1. **Connect** - Works with Claude Desktop, Cline, Cursor, and other MCP clients
2. **Ask** - Send your question through your agent
3. **Get perspectives** - Receive responses from multiple AI models
4. **Choose** - Pick the best solution

## Example

\`\`\`javascript
await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "My React component re-renders excessively. Help debug this.",
    project_memory: "full"
  }
});
\`\`\`

Returns perspectives from Claude, GPT, Gemini, and others.

## Features

- **Multiple models** - Query Claude, GPT, Gemini simultaneously
- **Smart fallback** - Uses your CLI tools first, then API keys, then credits
- **Project context** - Includes relevant files from your codebase
- **Zero setup** - Works with existing Claude Desktop/Cline installations

Ready to get started? [Quick Start →](#quick-start)
`,
      'quick-start': `
# Quick Start

Get Polydev running in 2 minutes.

## Install

\`\`\`bash
git clone https://github.com/polydev-ai/polydev.git
cd polydev
npm install
\`\`\`

## Setup

**Option 1: Use existing CLI tools (recommended)**

If you have Claude Desktop, Cline, or Cursor installed, you're done. Polydev will use these automatically.

**Option 2: Add your API keys**

\`\`\`bash
# Start dashboard
npm run dev

# Open http://localhost:3000
# Go to Settings → API Keys
# Add your OpenAI, Anthropic, or other API keys
\`\`\`

## Configure your agent

Add to your Claude Desktop config (\`~/Library/Application Support/Claude/claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"]
    }
  }
}
\`\`\`

## Test it

Ask your agent:

\`\`\`
"I'm having trouble with React re-renders. Can you get multiple perspectives on debugging this?"
\`\`\`

Your agent will use Polydev to query multiple AI models and give you diverse solutions.

## That's it

Polydev now handles multi-model requests automatically when your agent gets stuck.
`,
      'installation': `
# Installation Guide

Choose the installation method that works best for your development environment.

## Prerequisites

- **Node.js**: Version 18.0 or higher
- **Package Manager**: npm, yarn, or pnpm
- **Operating System**: macOS, Windows, or Linux

## Method 1: NPM Package (Recommended)

\`\`\`bash
# Install globally for CLI access
npm install -g @polydev/cli

# Or install locally in your project
npm install @polydev/sdk
\`\`\`

## Method 2: Package Managers

### Yarn

\`\`\`bash
# Global installation
yarn global add @polydev/cli

# Project installation
yarn add @polydev/sdk
\`\`\`

### PNPM

\`\`\`bash
# Global installation
pnpm add -g @polydev/cli

# Project installation
pnpm add @polydev/sdk
\`\`\`

## Method 3: Direct Download

For environments without Node.js:

\`\`\`bash
# macOS/Linux
curl -fsSL https://install.polydev.ai | sh

# Windows PowerShell
iwr -useb https://install.polydev.ai/windows | iex
\`\`\`

## Verification

Verify your installation:

\`\`\`bash
# Check CLI version
polydev --version

# Check available commands
polydev --help

# Test connection
polydev status
\`\`\`

## Framework Integration

### React/Next.js

\`\`\`bash
npm install @polydev/react
\`\`\`

\`\`\`jsx
import { usePolydev } from '@polydev/react'

function MyComponent() {
  const { ask, perspectives, loading } = usePolydev()

  const handleQuery = async () => {
    const result = await perspectives('Explain React Server Components')
    console.log(result)
  }

  return <button onClick={handleQuery}>Ask AI</button>
}
\`\`\`

### Python

\`\`\`bash
pip install polydev-python
\`\`\`

\`\`\`python
from polydev import Client

client = Client(api_key="your-key")
response = client.perspectives(
    prompt="Explain Python asyncio",
    models=["gpt-4", "claude-3-opus"]
)
\`\`\`

### Go

\`\`\`bash
go get github.com/polydev-ai/polydev-go
\`\`\`

\`\`\`go
package main

import "github.com/polydev-ai/polydev-go"

func main() {
    client := polydev.NewClient("your-api-key")
    response, err := client.Perspectives(polydev.PerspectivesRequest{
        Prompt: "Explain Go concurrency",
        Models: []string{"gpt-4", "claude-3-opus"},
    })
}
\`\`\`

## Troubleshooting

### Common Issues

**Permission denied on macOS/Linux:**
\`\`\`bash
sudo npm install -g @polydev/cli
\`\`\`

**Windows PowerShell execution policy:**
\`\`\`powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
\`\`\`

**Node.js version issues:**
\`\`\`bash
# Use nvm to manage Node.js versions
nvm install 18
nvm use 18
\`\`\`

### Getting Help

- **Documentation**: [docs.polydev.ai](https://docs.polydev.ai)
- **GitHub Issues**: [github.com/polydev-ai/polydev](https://github.com/polydev-ai/polydev)
- **Discord Community**: [discord.gg/polydev](https://discord.gg/polydev)
- **Email Support**: support@polydev.ai

Next: [Quick Start Guide →](#quick-start)
`,
      'environment': `
# Environment Setup

Configure Polydev for optimal performance, security, and cost management.

## API Key Configuration

### Option 1: Environment Variables (Recommended)

\`\`\`bash
# Polydev API key (required)
export POLYDEV_API_KEY="pd_your_api_key_here"

# Optional: Provider API keys for direct access
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="AIza..."
\`\`\`

### Option 2: Configuration File

Create \`.polydev/config.json\` in your home directory:

\`\`\`json
{
  "apiKey": "pd_your_api_key_here",
  "providers": {
    "openai": {
      "apiKey": "sk-...",
      "enabled": true
    },
    "anthropic": {
      "apiKey": "sk-ant-...",
      "enabled": true
    },
    "google": {
      "apiKey": "AIza...",
      "enabled": true
    }
  },
  "preferences": {
    "defaultModels": ["gpt-4", "claude-3-opus", "gemini-pro"],
    "costOptimization": true,
    "cacheEnabled": true
  }
}
\`\`\`

### Option 3: CLI Configuration

\`\`\`bash
# Set API key
polydev config set api-key pd_your_api_key_here

# Set default models
polydev config set default-models gpt-4,claude-3-opus,gemini-pro

# Enable cost optimization
polydev config set cost-optimization true
\`\`\`

## Advanced Configuration

### Cost Management

\`\`\`javascript
// polydev.config.js
module.exports = {
  costOptimization: {
    enabled: true,
    maxCostPerRequest: 0.25,        // Maximum $0.25 per request
    maxDailyCost: 50.00,            // Daily budget limit
    preferCheaperModels: true,      // Prefer cost-effective options
    fallbackToFreeProviders: true, // Use CLI tools as fallback
  },

  routing: {
    strategy: "cost-optimized",     // or "performance", "balanced"
    priorities: ["cost", "speed", "quality"]
  }
}
\`\`\`

### Performance Settings

\`\`\`javascript
module.exports = {
  performance: {
    timeout: 30000,          // 30 second timeout
    retries: 3,              // Retry failed requests 3 times
    concurrent: 5,           // Max 5 concurrent requests
    caching: {
      enabled: true,
      ttl: 3600,            // Cache for 1 hour
      strategy: "intelligent" // or "aggressive", "minimal"
    }
  },

  fallback: {
    enabled: true,
    chain: [
      "gpt-4",
      "claude-3-opus",
      "gemini-pro",
      "llama-3.3-70b"
    ],
    timeout: 10000          // 10 second timeout per model
  }
}
\`\`\`

### Security Configuration

\`\`\`javascript
module.exports = {
  security: {
    encryptLocalCache: true,        // Encrypt cached responses
    anonymizeRequests: true,        // Remove PII from logs
    auditLogging: true,             // Enable audit trails

    // Data retention
    dataRetention: {
      requests: 30,                 // Keep request logs for 30 days
      responses: 7,                 // Keep responses for 7 days
      cache: 1                      // Keep cache for 1 day
    }
  }
}
\`\`\`

## Environment-Specific Settings

### Development

\`\`\`bash
# .env.development
POLYDEV_ENV=development
POLYDEV_DEBUG=true
POLYDEV_CACHE_TTL=300
POLYDEV_COST_LIMIT=5.00
\`\`\`

### Production

\`\`\`bash
# .env.production
POLYDEV_ENV=production
POLYDEV_DEBUG=false
POLYDEV_CACHE_TTL=3600
POLYDEV_COST_LIMIT=100.00
POLYDEV_MONITORING=true
\`\`\`

### Testing

\`\`\`bash
# .env.test
POLYDEV_ENV=test
POLYDEV_USE_MOCK=true
POLYDEV_CACHE_ENABLED=false
\`\`\`

## Validation & Testing

### Verify Configuration

\`\`\`bash
# Check configuration status
polydev config status

# Test API connectivity
polydev test connection

# Validate API keys
polydev test auth

# Test model access
polydev test models --model gpt-4
\`\`\`

### Health Checks

\`\`\`bash
# Full system health check
polydev health

# Check provider status
polydev status providers

# Check cost usage
polydev usage today
\`\`\`

## IDE Integration

### VS Code

Create \`.vscode/settings.json\`:

\`\`\`json
{
  "polydev.apiKey": "\${env:POLYDEV_API_KEY}",
  "polydev.defaultModels": ["gpt-4", "claude-3-opus"],
  "polydev.costOptimization": true
}
\`\`\`

### JetBrains IDEs

Configure in IDE settings or \`~/.polydev/jetbrains.properties\`:

\`\`\`properties
polydev.apiKey=\${POLYDEV_API_KEY}
polydev.defaultModels=gpt-4,claude-3-opus
polydev.costOptimization=true
\`\`\`

Ready to configure authentication? [Continue to Authentication →](#authentication)
`
    }

    const result = samples[itemId] || samples['what-is-polydev']

    // Cache the result
    docsCache.content.set(itemId, result)
    docsCache.timestamps.set(itemId, Date.now())
    return result
  }, [])

  // Optimized load content with debouncing and caching
  const loadContent = useCallback(async (filePath: string, showLoading = true) => {
    if (!filePath) return

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce the content loading
    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return

      // Check cache first
      if (docsCache.content.has(filePath)) {
        const cachedData = docsCache.content.get(filePath)!
        const timestamp = docsCache.timestamps.get(filePath) || 0
        if (Date.now() - timestamp < docsCache.CACHE_DURATION) {
          setContent(cachedData)
          return
        }
      }

    if (showLoading) {
      setLoading(true)
    }

    // Get the item ID from the current active item for sample content
    const itemId = activeItem

    try {
      const response = await fetch(`/api/docs?path=${encodeURIComponent(filePath)}`)
      if (response.ok) {
        const markdown = await response.text()
        const html = await marked(markdown)
        const processedHtml = processMarkdownContent(html)
        setContent(processedHtml)
      } else {
        // Use sample content instead of error message
        const sampleMarkdown = getSampleContent(itemId)
        const html = await marked(sampleMarkdown)
        const processedHtml = processMarkdownContent(html)
        setContent(processedHtml)
      }
    } catch (error) {
      console.error('Error loading documentation:', error)
      // Use sample content instead of error message
      const sampleMarkdown = getSampleContent(itemId)
      const html = await marked(sampleMarkdown)
      const processedHtml = processMarkdownContent(html)
      setContent(processedHtml)

      // Cache the processed content
      docsCache.content.set(filePath, processedHtml)
      docsCache.timestamps.set(filePath, Date.now())
    } finally {
      if (showLoading && isMountedRef.current) {
        setLoading(false)
      }
    }
    }, 300) // 300ms debounce
  }, [activeItem, processMarkdownContent, getSampleContent])

  // Cleanup function for component unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Load initial content immediately with sample data
  useEffect(() => {
    const initialSection = docSections.find(s => s.id === activeSection)
    const initialItem = initialSection?.items?.[0]
    if (initialItem) {
      setActiveItem(initialItem.href.replace('#', ''))

      // Immediately show sample content to prevent loading delay
      const itemId = initialItem.href.replace('#', '')
      const sampleMarkdown = getSampleContent(itemId)
      Promise.resolve(marked(sampleMarkdown)).then(html => {
        const processedHtml = processMarkdownContent(html)
        setContent(processedHtml)
      })

      // Then try to load real content in the background without showing loading
      if (initialItem.filePath) {
        loadContent(initialItem.filePath, false)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Add click handlers for copy buttons after content loads
  useEffect(() => {
    const handleCopyClick = async (e: Event) => {
      const target = e.target as HTMLElement
      const button = target.closest('.copy-btn') as HTMLButtonElement
      if (!button) return

      const code = button.getAttribute('data-code')
      if (!code) return

      try {
        await navigator.clipboard.writeText(code)
        const svg = button.querySelector('svg')
        if (svg) {
          svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>`
          svg.classList.remove('text-gray-600')
          svg.classList.add('text-green-600')
          setTimeout(() => {
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>`
            svg.classList.remove('text-green-600')
            svg.classList.add('text-gray-600')
          }, 2000)
        }
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    }

    document.addEventListener('click', handleCopyClick)
    return () => document.removeEventListener('click', handleCopyClick)
  }, [content])

  // Handle section/item changes
  const handleItemClick = (item: any) => {
    setActiveItem(item.href.replace('#', ''))
    if (item.filePath) {
      loadContent(item.filePath)
    }
  }

  const { prev, next } = getNavigationItems()
  const currentItem = getCurrentItemIndex()

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-7 w-7 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Documentation</h1>
                <p className="text-sm text-gray-500 hidden sm:block">Polydev AI Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              {currentItem && (
                <div className="hidden lg:flex items-center space-x-2 text-gray-500">
                  <span>{currentItem.section.title}</span>
                  <span>•</span>
                  <span className="text-gray-900 font-medium">{currentItem.item.title}</span>
                </div>
              )}
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex">
          {/* Modern Sidebar */}
          <div className="w-80 flex-shrink-0 bg-gray-50/50 border-r border-gray-200 min-h-screen">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="p-6">
                {/* Quick Actions */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Quick Start</h3>
                  <div className="space-y-2">
                    <Link
                      href="/docs/quickstart"
                      className="flex items-center justify-between p-3 bg-slate-900 rounded-xl hover:bg-black transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <Zap className="h-5 w-5 text-white" />
                        <div>
                          <div className="font-medium text-white">Docs Quickstart</div>
                          <div className="text-xs text-slate-300">3 steps • 2 minutes</div>
                        </div>
                      </div>
                      <span className="text-slate-300 group-hover:text-white">→</span>
                    </Link>
                    <Link
                      href="/chat"
                      className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors group"
                    >
                      <Zap className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">Try Polydev</div>
                        <div className="text-xs text-blue-600">Multi-model chat</div>
                      </div>
                    </Link>
                    <Link
                      href="/dashboard/models"
                      className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group"
                    >
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium text-green-900">Setup API Keys</div>
                        <div className="text-xs text-green-600">Configure providers</div>
                      </div>
                    </Link>
                    <Link
                      href="/dashboard/mcp-tokens"
                      className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors group"
                    >
                      <Code2 className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-purple-900">MCP Tokens</div>
                        <div className="text-xs text-purple-600">For CLI integration</div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Documentation</h3>
                  {docSections.map((section) => (
                    <div key={section.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveSection(section.id)
                          if (section.items.length > 0) {
                            handleItemClick(section.items[0])
                          }
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                          activeSection === section.id
                            ? 'text-blue-900 bg-blue-50 border border-blue-200'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        {section.title}
                      </button>
                      {activeSection === section.id && (
                        <div className="ml-2 space-y-1 border-l-2 border-blue-100 pl-4">
                          {section.items.map((item) => (
                            <button
                              key={item.href}
                              onClick={() => handleItemClick(item)}
                              className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                activeItem === item.href.replace('#', '')
                                  ? 'text-blue-900 bg-blue-100 font-medium'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {item.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Modern Main Content */}
          <div className="flex-1 min-w-0">
            <div className="px-8 lg:px-16 py-12">
              {loading ? (
                <div className="flex items-center justify-center py-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
                    <p className="text-gray-600 text-lg">Loading documentation...</p>
                  </div>
                </div>
              ) : (
                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
                  <article
                    id="doc-content"
                    className="prose prose-gray max-w-none prose-xl prose-headings:text-gray-900 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-5xl prose-h1:mb-8 prose-h1:leading-tight prose-h2:text-4xl prose-h2:leading-tight prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-4 prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6 prose-h3:font-semibold prose-p:text-gray-700 prose-p:leading-8 prose-p:mb-8 prose-p:text-lg prose-li:text-gray-700 prose-li:mb-3 prose-li:text-lg prose-a:text-blue-600 prose-a:font-medium prose-a:no-underline hover:prose-a:text-blue-700 hover:prose-a:underline prose-code:text-blue-800 prose-code:bg-blue-50 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:text-base prose-code:font-mono prose-code:font-medium prose-pre:bg-gray-50 prose-pre:text-gray-900 prose-pre:border prose-pre:border-gray-200 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-6 prose-blockquote:px-8 prose-blockquote:my-10 prose-blockquote:rounded-r-xl prose-blockquote:border-l-4 prose-strong:text-gray-900 prose-strong:font-semibold max-w-3xl"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                  <nav className="hidden lg:block sticky top-24 self-start text-sm border-l border-gray-200 pl-6">
                    <div className="font-semibold text-gray-900 mb-3">On this page</div>
                    <ul className="space-y-2 text-gray-600">
                      {toc.map((item, idx) => (
                        <li key={idx}>
                          <a href={`#${item.id}`} className={`block hover:text-gray-900 ${item.level === 3 ? 'pl-4 text-gray-500' : ''}`}>{item.text}</a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              )}

              {/* Enhanced Navigation */}
              {(prev || next) && (
                <div className="mt-24 pt-12 border-t border-gray-200">
                  <div className="flex justify-between items-center gap-8">
                    {prev ? (
                      <button
                        onClick={() => handleItemClick(prev)}
                        className="flex items-center space-x-4 px-8 py-6 text-left bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 group flex-1"
                      >
                        <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                          <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Previous</div>
                          <div className="font-bold text-gray-900 text-lg truncate">{prev.title}</div>
                          <div className="text-sm text-gray-600">{prev.section}</div>
                        </div>
                      </button>
                    ) : (
                      <div className="flex-1"></div>
                    )}

                    {next && (
                      <button
                        onClick={() => handleItemClick(next)}
                        className="flex items-center space-x-4 px-8 py-6 text-right bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 group flex-1"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Next</div>
                          <div className="font-bold text-gray-900 text-lg truncate">{next.title}</div>
                          <div className="text-sm text-gray-600">{next.section}</div>
                        </div>
                        <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modern Footer */}
            <div className="px-8 lg:px-16 py-8 border-t border-gray-200 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="text-gray-600">
                  <div className="font-medium text-gray-900 mb-1">Polydev Documentation</div>
                  <div className="text-sm">Unified AI platform for developers</div>
                </div>
                <div className="flex space-x-8 text-sm">
                  <a
                    href="https://github.com/polydev-ai/polydev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://discord.gg/polydev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    Discord
                  </a>
                  <Link
                    href="/dashboard/support"
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
