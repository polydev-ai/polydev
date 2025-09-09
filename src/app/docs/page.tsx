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
      const response = await fetch(filePath)
      if (response.ok) {
        const markdown = await response.text()
        const html = marked(markdown)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 lg:flex-shrink-0">
            <div className="sticky top-8">
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
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
                            className={`block w-full text-left px-3 py-1 text-sm transition-colors rounded ${
                              activeItem === item.href.replace('#', '')
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
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
              <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
                <div className="space-y-2 text-xs">
                  <Link 
                    href="/dashboard/models"
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Configure API Keys
                  </Link>
                  <Link 
                    href="/dashboard/mcp-tokens"
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Generate MCP Tokens
                  </Link>
                  <Link 
                    href="/chat"
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Try Multi-Model Chat
                  </Link>
                  <Link 
                    href="/dashboard/preferences"
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    User Preferences
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Loading documentation...</p>
                </div>
              ) : (
                <div 
                  className="prose prose-gray dark:prose-invert max-w-none p-8"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>
            
            {/* Navigation Footer */}
            <div className="mt-8 flex justify-between items-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                📚 Comprehensive documentation for Polydev AI
              </div>
              <div className="flex space-x-4 text-sm">
                <a 
                  href="https://github.com/polydev-ai/polydev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  GitHub
                </a>
                <a 
                  href="https://discord.gg/polydev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Discord
                </a>
                <Link 
                  href="/dashboard/support"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
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