'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { marked } from 'marked'

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

  // Load content from markdown files
  const loadContent = async (filePath: string) => {
    if (!filePath) return

    setLoading(true)
    try {
      const response = await fetch(`/api/docs?path=${encodeURIComponent(filePath)}`)
      if (response.ok) {
        const markdown = await response.text()
        const html = await marked(markdown)
        setContent(html)
      } else {
        setContent('<p>Documentation content not found. Please check back later.</p>')
      }
    } catch (error) {
      console.error('Error loading documentation:', error)
      setContent('<p>Error loading documentation. Please try again later.</p>')
    } finally {
      setLoading(false)
    }
  }

  // Load initial content
  useEffect(() => {
    const initialSection = docSections.find(s => s.id === activeSection)
    const initialItem = initialSection?.items?.[0]
    if (initialItem?.filePath) {
      setActiveItem(initialItem.href.replace('#', ''))
      loadContent(initialItem.filePath)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle section/item changes
  const handleItemClick = (item: any) => {
    setActiveItem(item.href.replace('#', ''))
    if (item.filePath) {
      loadContent(item.filePath)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <div className="lg:w-64 lg:flex-shrink-0">
            <div className="sticky top-8">
              <nav className="space-y-0.5">
                {docSections.map((section) => (
                  <div key={section.id} className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveSection(section.id)
                        if (section.items.length > 0) {
                          handleItemClick(section.items[0])
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {section.title}
                    </button>
                    {activeSection === section.id && (
                      <div className="ml-3 space-y-0.5 border-l border-gray-200">
                        {section.items.map((item) => (
                          <button
                            key={item.href}
                            onClick={() => handleItemClick(item)}
                            className={`block w-full text-left px-3 py-1.5 text-sm transition-colors ${
                              activeItem === item.href.replace('#', '')
                                ? 'text-gray-900 font-medium border-l-2 border-gray-900 -ml-px'
                                : 'text-gray-500 hover:text-gray-700 pl-4'
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
              <div className="mt-12 p-4 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
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

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading documentation...</p>
                </div>
              ) : (
                <div
                  className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-a:text-gray-700 prose-a:no-underline hover:prose-a:underline prose-code:text-gray-900 prose-code:bg-gray-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>

            {/* Navigation Footer */}
            <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                📚 Comprehensive documentation for Polydev AI
              </div>
              <div className="flex space-x-6 text-sm">
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
  )
}