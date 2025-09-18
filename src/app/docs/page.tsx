'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { marked } from 'marked'
import { ChevronLeft, ChevronRight, Copy, Check, FileText } from 'lucide-react'

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
      className="absolute top-3 right-3 p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors duration-200 opacity-0 group-hover:opacity-100"
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

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [activeItem, setActiveItem] = useState('introduction')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      items: [
        { title: 'What is Polydev?', href: '#what-is-polydev', filePath: '/docs/intro/what-is-polydev.md' },
        { title: 'Quick Start', href: '#quick-start', filePath: '/docs/intro/quick-start.md' },
        { title: 'Architecture', href: '#architecture', filePath: '/docs/intro/architecture.md' }
      ]
    },
    {
      id: 'configuration',
      title: 'Configuration',
      items: [
        { title: 'Environment Setup', href: '#environment', filePath: '/docs/config/environment.md' },
        { title: 'Authentication', href: '#authentication', filePath: '/docs/config/authentication.md' },
        { title: 'User Preferences', href: '#preferences', filePath: '/docs/config/preferences.md' },
        { title: 'Troubleshooting', href: '#troubleshooting', filePath: '/docs/config/troubleshooting.md' }
      ]
    },
    {
      id: 'providers',
      title: 'AI Providers',
      items: [
        { title: 'Provider Overview', href: '#providers-overview', filePath: '/docs/providers/index.md' },
        { title: 'Claude Code CLI', href: '#claude-code', filePath: '/docs/providers/cli-providers/claude-code.md' },
        { title: 'Continue.dev', href: '#continue', filePath: '/docs/providers/cli-providers/continue.md' },
        { title: 'Cursor', href: '#cursor', filePath: '/docs/providers/cli-providers/cursor.md' },
        { title: 'Cline (VS Code)', href: '#cline', filePath: '/docs/providers/cli-providers/cline.md' },
        { title: 'OpenAI API', href: '#openai', filePath: '/docs/providers/api-providers/openai.md' },
        { title: 'Custom Providers', href: '#custom-providers', filePath: '/docs/providers/custom-providers.md' }
      ]
    },
    {
      id: 'mcp-integration',
      title: 'MCP Integration',
      items: [
        { title: 'MCP Overview', href: '#mcp-overview', filePath: '/docs/mcp/overview.md' },
        { title: 'Server Setup', href: '#mcp-server-setup', filePath: '/docs/mcp/server-setup.md' }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      items: [
        { title: 'Features Overview', href: '#features-overview', filePath: '/docs/features/index.md' },
        { title: 'Multi-LLM Perspectives', href: '#perspectives', filePath: '/docs/features/perspectives/index.md' },
        { title: 'Intelligent Fallback', href: '#fallback', filePath: '/docs/features/fallback/index.md' }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      items: [
        { title: 'API Overview', href: '#api-overview', filePath: '/docs/api-reference/index.md' },
        { title: 'Perspectives API', href: '#perspectives-api', filePath: '/docs/api-reference/perspectives/index.md' }
      ]
    }
  ]

  // Get current item index for navigation
  const getCurrentItemIndex = () => {
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
  }

  const getNavigationItems = () => {
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
  }

  // Enhanced markdown processing with better code block handling
  const processMarkdownContent = (html: string) => {
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
          <div class="relative group my-6">
            <pre class="bg-slate-50 text-slate-800 rounded-xl p-6 overflow-x-auto border border-slate-200 font-mono text-sm leading-relaxed shadow-sm"><code${attributes}>${code}</code></pre>
            <button class="copy-btn absolute top-4 right-4 p-2 rounded-lg bg-white hover:bg-slate-50 transition-colors duration-200 opacity-0 group-hover:opacity-100 border border-slate-200 shadow-sm" data-code="${decodedCode.replace(/"/g, '&quot;')}" title="Copy to clipboard">
              <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        `
      }
    )
  }

  // Sample content to show while loading or when files don't exist
  const getSampleContent = (itemId: string) => {
    const samples: Record<string, string> = {
      'what-is-polydev': `
# What is Polydev?

Polydev is a powerful platform that unifies multiple AI models and providers into a single, coherent interface. It allows developers to leverage the best of different AI models without the complexity of managing multiple APIs and integrations.

## Key Features

- **Multi-Model Access**: Query 340+ AI models from 37+ providers
- **Intelligent Fallback**: Automatically switch between providers for optimal responses
- **Cost Optimization**: Smart routing to minimize API costs
- **Developer Integration**: Works seamlessly with popular development tools

## Supported AI Providers

\`\`\`javascript
const providers = [
  'OpenAI GPT-4, GPT-5',
  'Anthropic Claude Opus 4',
  'Google Gemini 2.5 Pro',
  'Meta Llama',
  'DeepSeek',
  'Grok',
  // ... and 340+ more models
];
\`\`\`

## Getting Started

1. Sign up for a Polydev account
2. Configure your API keys
3. Start querying multiple models
4. Integrate with your favorite development tools

Ready to get started? Check out our [Quick Start Guide](#quick-start).
`,
      'quick-start': `
# Quick Start Guide

Get up and running with Polydev in less than 5 minutes.

## Step 1: Create Your Account

1. Visit [polydev.ai](https://polydev.ai)
2. Click "Sign Up"
3. Complete the registration process

## Step 2: Configure API Keys

Navigate to your dashboard and add your API keys:

\`\`\`bash
# Example: Adding OpenAI API key
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

## Step 3: Install CLI Tools

\`\`\`bash
# Install Claude Code CLI
npm install -g @anthropic/claude-code

# Install Continue.dev extension
code --install-extension continue.continue

# Install Cursor
curl -fsSL https://cursor.sh/install.sh | sh
\`\`\`

## Step 4: Make Your First Request

\`\`\`javascript
import { polydev } from '@polydev/sdk';

const response = await polydev.perspectives({
  prompt: "Explain quantum computing",
  models: ["gpt-4", "claude-3-opus", "gemini-pro"]
});

console.log(response);
\`\`\`

## Next Steps

- Explore [Configuration Options](#environment)
- Learn about [AI Providers](#providers-overview)
- Try [Multi-LLM Perspectives](#perspectives)
`,
      'architecture': `
# Architecture Overview

Polydev is built with a modular, scalable architecture that ensures reliability and performance.

## System Components

\`\`\`mermaid
graph TD
    A[Client Applications] --> B[Polydev API Gateway]
    B --> C[Model Router]
    C --> D[Provider Adapters]
    D --> E[AI Model Providers]
    B --> F[Authentication Service]
    B --> G[Usage Analytics]
    B --> H[Caching Layer]
\`\`\`

## Key Components

### API Gateway
- Rate limiting and throttling
- Request validation
- Response formatting
- Error handling

### Model Router
- Intelligent model selection
- Fallback strategies
- Load balancing
- Cost optimization

### Provider Adapters
- Unified interface for different AI providers
- Protocol translation
- Error normalization
- Response standardization

## Data Flow

1. **Request Reception**: Client sends request to API Gateway
2. **Authentication**: Verify user credentials and permissions
3. **Model Selection**: Router selects optimal model(s)
4. **Provider Execution**: Adapters communicate with AI providers
5. **Response Processing**: Standardize and cache responses
6. **Analytics**: Log usage and performance metrics

## Security

- End-to-end encryption
- Zero-knowledge architecture for sensitive data
- API key encryption at rest
- Regular security audits
`,
      'environment': `
# Environment Setup

Configure your Polydev environment for optimal performance and security.

## API Keys Configuration

Set up your AI provider API keys securely:

\`\`\`bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google
export GOOGLE_API_KEY="AIza..."

# Optional: Use .env file
echo "OPENAI_API_KEY=sk-..." >> .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
\`\`\`

## Environment Variables

\`\`\`bash
# Polydev Configuration
export POLYDEV_API_URL="https://api.polydev.ai"
export POLYDEV_TIMEOUT="30000"
export POLYDEV_RETRY_ATTEMPTS="3"

# Development vs Production
export NODE_ENV="development"
export POLYDEV_DEBUG="true"
\`\`\`

## Configuration File

Create a \`polydev.config.js\` file:

\`\`\`javascript
module.exports = {
  apiUrl: process.env.POLYDEV_API_URL,
  timeout: 30000,
  retries: 3,
  models: {
    preferred: ["gpt-4", "claude-3-opus"],
    fallback: ["gpt-3.5-turbo", "claude-3-haiku"],
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
  }
};
\`\`\`

## Verification

Test your setup:

\`\`\`bash
# Check environment
polydev env check

# Test API connection
polydev test connection

# Verify API keys
polydev keys verify
\`\`\`
`
    }

    return samples[itemId] || samples['what-is-polydev']
  }

  // Load content from markdown files
  const loadContent = async (filePath: string, showLoading = true) => {
    if (!filePath) return

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
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  // Load initial content immediately with sample data
  useEffect(() => {
    const initialSection = docSections.find(s => s.id === activeSection)
    const initialItem = initialSection?.items?.[0]
    if (initialItem) {
      setActiveItem(initialItem.href.replace('#', ''))

      // Immediately show sample content to prevent loading delay
      const itemId = initialItem.href.replace('#', '')
      const sampleMarkdown = getSampleContent(itemId)
      marked(sampleMarkdown).then(html => {
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
          svg.classList.remove('text-slate-600')
          svg.classList.add('text-green-600')
          setTimeout(() => {
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>`
            svg.classList.remove('text-green-600')
            svg.classList.add('text-slate-600')
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
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <FileText className="h-6 w-6 text-gray-900" />
              <h1 className="text-xl font-semibold text-gray-900">Documentation</h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {currentItem && (
                <>
                  <span>{currentItem.section.title}</span>
                  <span>•</span>
                  <span>{currentItem.item.title}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-200 min-h-screen">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <div className="p-6">
                <nav className="space-y-1">
                  {docSections.map((section) => (
                    <div key={section.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveSection(section.id)
                          if (section.items.length > 0) {
                            handleItemClick(section.items[0])
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeSection === section.id
                            ? 'text-gray-900 bg-gray-200'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {section.title}
                      </button>
                      {activeSection === section.id && (
                        <div className="ml-4 space-y-1">
                          {section.items.map((item) => (
                            <button
                              key={item.href}
                              onClick={() => handleItemClick(item)}
                              className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                activeItem === item.href.replace('#', '')
                                  ? 'text-gray-900 bg-white border border-gray-200 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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

                {/* Quick Links */}
                <div className="mt-8 p-4 bg-white border border-gray-200 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Links</h3>
                  <div className="space-y-2 text-sm">
                    <Link
                      href="/dashboard/models"
                      className="block text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Configure API Keys
                    </Link>
                    <Link
                      href="/dashboard/mcp-tokens"
                      className="block text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Generate MCP Tokens
                    </Link>
                    <Link
                      href="/chat"
                      className="block text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Try Multi-Model Chat
                    </Link>
                    <Link
                      href="/dashboard/preferences"
                      className="block text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      User Preferences
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="px-12 py-12 max-w-4xl">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-6"></div>
                    <p className="text-slate-600 text-lg">Loading documentation...</p>
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-slate max-w-none prose-lg prose-headings:text-slate-900 prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-slate-700 prose-p:leading-8 prose-p:mb-6 prose-li:text-slate-700 prose-li:mb-2 prose-a:text-slate-900 prose-a:font-medium prose-a:no-underline hover:prose-a:text-slate-700 hover:prose-a:underline prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:font-medium prose-pre:bg-slate-50 prose-pre:text-slate-800 prose-pre:border prose-pre:border-slate-200 prose-blockquote:border-l-slate-300 prose-blockquote:bg-slate-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}

              {/* Previous/Next Navigation */}
              {(prev || next) && (
                <div className="mt-20 pt-12 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    {prev ? (
                      <button
                        onClick={() => handleItemClick(prev)}
                        className="flex items-center space-x-3 px-6 py-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        <div className="text-left">
                          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Previous</div>
                          <div className="mt-1 font-semibold">{prev.title}</div>
                        </div>
                      </button>
                    ) : (
                      <div></div>
                    )}

                    {next && (
                      <button
                        onClick={() => handleItemClick(next)}
                        className="flex items-center space-x-3 px-6 py-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
                      >
                        <div className="text-right">
                          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Next</div>
                          <div className="mt-1 font-semibold">{next.title}</div>
                        </div>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-600">
                  📚 Comprehensive documentation for Polydev AI
                </div>
                <div className="flex space-x-6">
                  <a
                    href="https://github.com/polydev-ai/polydev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://discord.gg/polydev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Discord
                  </a>
                  <Link
                    href="/dashboard/support"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
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