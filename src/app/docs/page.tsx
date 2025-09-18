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
          <div class="relative group">
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto border border-gray-200 font-mono text-sm leading-relaxed"><code${attributes}>${code}</code></pre>
            <button class="copy-btn absolute top-3 right-3 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors duration-200 opacity-0 group-hover:opacity-100" data-code="${decodedCode.replace(/"/g, '&quot;')}" title="Copy to clipboard">
              <svg class="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        `
      }
    )
  }

  // Load content from markdown files
  const loadContent = async (filePath: string) => {
    if (!filePath) return

    setLoading(true)
    try {
      const response = await fetch(`/api/docs?path=${encodeURIComponent(filePath)}`)
      if (response.ok) {
        const markdown = await response.text()
        const html = await marked(markdown)
        const processedHtml = processMarkdownContent(html)
        setContent(processedHtml)
      } else {
        setContent('<div class="flex items-center justify-center p-8 text-gray-500"><div class="text-center"><svg class="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><p class="text-lg font-medium">Documentation content not found</p><p class="text-sm">Please check back later or contact support.</p></div></div>')
      }
    } catch (error) {
      console.error('Error loading documentation:', error)
      setContent('<div class="flex items-center justify-center p-8 text-red-500"><div class="text-center"><svg class="h-12 w-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="text-lg font-medium">Error loading documentation</p><p class="text-sm">Please try again later.</p></div></div>')
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
          svg.classList.add('text-green-400')
          setTimeout(() => {
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>`
            svg.classList.remove('text-green-400')
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
            <div className="px-8 py-8">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading documentation...</p>
                  </div>
                </div>
              ) : (
                <div
                  className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-7 prose-li:text-gray-700 prose-a:text-gray-900 prose-a:font-medium hover:prose-a:text-gray-700 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:bg-gray-900 prose-pre:text-gray-100"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}

              {/* Previous/Next Navigation */}
              {(prev || next) && (
                <div className="mt-16 pt-8 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    {prev ? (
                      <button
                        onClick={() => handleItemClick(prev)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <div className="text-left">
                          <div className="text-xs text-gray-500">Previous</div>
                          <div>{prev.title}</div>
                        </div>
                      </button>
                    ) : (
                      <div></div>
                    )}

                    {next && (
                      <button
                        onClick={() => handleItemClick(next)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Next</div>
                          <div>{next.title}</div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
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