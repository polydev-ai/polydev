'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { Clock, MessageSquare, Folder, Tag, Search, Trash2, RefreshCw, Shield, Key, Database, AlertTriangle, CheckCircle } from 'lucide-react'

interface ConversationMemory {
  id: string
  created_at: string
  user_message: string
  assistant_response: string
  model_used: string
  tokens_used: number
  conversation_hash: string
  session_id?: string
  project_identifier: string
}

interface ProjectMemory {
  id: string
  user_id: string
  project_identifier: string
  memory_type: 'context' | 'pattern' | 'decision' | 'issue' | 'preference'
  title: string
  content: string
  relevance_score: number
  tags: string[]
  created_at: string
  updated_at: string
}

export default function MemoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [memories, setMemories] = useState<{
    conversations: ConversationMemory[]
    projectMemories: ProjectMemory[]
  }>({ conversations: [], projectMemories: [] })
  const [loading, setLoading] = useState(false) // Disabled by default
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'projects'>('conversations')
  const [error, setError] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<ConversationMemory | ProjectMemory | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isFeatureDisabled] = useState(false) // Enable zero-knowledge memory features

  useEffect(() => {
    if (user && !isFeatureDisabled) {
      fetchMemories()
    }
  }, [user, isFeatureDisabled])

  const fetchMemories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('[Frontend] Fetching memories...')
      const response = await fetch(`/api/memory?query=${encodeURIComponent(searchQuery || 'all')}`)
      const result = await response.json()
      
      console.log('[Frontend] API response:', result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch memories')
      }
      
      console.log('[Frontend] Setting memories:', {
        conversations: result.data.conversations?.length || 0,
        projectMemories: result.data.projectMemories?.length || 0
      })
      
      setMemories({
        conversations: result.data.conversations || [],
        projectMemories: result.data.projectMemories || []
      })
    } catch (err: any) {
      console.error('[Frontend] Error fetching memories:', err)
      setError(err.message || 'Failed to fetch memories')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (user) {
      try {
        const response = await fetch(`/api/memory?query=${encodeURIComponent(query || 'all')}`)
        const result = await response.json()
        
        if (response.ok) {
          setMemories({
            conversations: result.data.conversations,
            projectMemories: result.data.projectMemories
          })
        }
      } catch (err) {
        console.error('Search error:', err)
      }
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid Date'
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Please log in to view your memories.
        </div>
      </div>
    )
  }

  if (isFeatureDisabled) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-blue-500" />
            Zero-Knowledge Memory Management
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Securely manage CLI tool memories with enterprise-grade client-side encryption
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Feature Temporarily Disabled
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  The memory management feature is currently disabled due to Claude Code architectural limitations. 
                  Claude Code does not automatically include conversation history or project memory in MCP requests, 
                  making server-side memory synchronization impossible without local components.
                </p>
                <p className="mt-2">
                  <strong>Technical Issue:</strong> Vercel's serverless environment cannot access local Claude Code files 
                  (stored in <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">~/.claude/projects/*.jsonl</code>).
                </p>
                <p className="mt-2">
                  <strong>Future Solution:</strong> This feature may be re-enabled if local context bridge components 
                  are implemented or if Claude Code adds automatic context transmission to MCP servers.
                </p>
              </div>
              <div className="mt-4">
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">To reactivate (for developers):</p>
                  <ol className="list-decimal list-inside text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>Set <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">isFeatureDisabled = false</code> in this component</li>
                    <li>Ensure proper backend memory infrastructure is in place</li>
                    <li>Test with actual Claude Code integration</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For more technical details, see the comprehensive analysis in 
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded ml-1">CLAUDE_CODE_MCP_CONTEXT_ANALYSIS.md</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-8 h-8 mr-3 text-blue-500" />
          Zero-Knowledge Memory Management
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Securely manage CLI tool memories with enterprise-grade client-side encryption
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="text-red-800 dark:text-red-200">
            Error: {error}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm"
          >
            Search
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'conversations'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Conversations ({memories.conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Folder className="w-4 h-4 inline mr-2" />
            Project Memories ({memories.projectMemories.length})
          </button>
        </nav>
      </div>

      {/* Refresh Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={fetchMemories}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Content */}
      {activeTab === 'conversations' && (
        <div className="space-y-4">
          {memories.conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No conversation memories found.</p>
              {searchQuery && <p className="text-sm mt-2">Try a different search term.</p>}
            </div>
          ) : (
            memories.conversations.map((conv) => (
              <div 
                key={conv.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedMemory(conv)
                  setShowModal(true)
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(conv.created_at)}</span>
                    <span>•</span>
                    <span>{conv.model_used}</span>
                    <span>•</span>
                    <span>{conv.tokens_used} tokens</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User:</div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm">
                      {truncateText(conv.user_message)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assistant:</div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 text-sm">
                      {truncateText(conv.assistant_response)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.projectMemories.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No project memories found.</p>
              {searchQuery && <p className="text-sm mt-2">Try a different search term.</p>}
            </div>
          ) : (
            memories.projectMemories.map((memory) => (
              <div 
                key={memory.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedMemory(memory)
                  setShowModal(true)
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                      {memory.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        memory.memory_type === 'context' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        memory.memory_type === 'pattern' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        memory.memory_type === 'decision' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {memory.memory_type}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {Math.round(memory.relevance_score * 100)}%
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {truncateText(memory.content, 150)}
                </div>
                
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {memory.tags.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{memory.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Project: {memory.project_identifier}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Updated: {formatDate(memory.updated_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Memory Detail Modal */}
      {showModal && selectedMemory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {'user_message' in selectedMemory ? 'Conversation Memory' : 'Project Memory'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedMemory(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {'user_message' in selectedMemory ? (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(selectedMemory.created_at)}</span>
                    <span>•</span>
                    <span>{selectedMemory.model_used}</span>
                    <span>•</span>
                    <span>{selectedMemory.tokens_used} tokens</span>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">User Message:</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 text-sm whitespace-pre-wrap">
                      {selectedMemory.user_message}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">Assistant Response:</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {selectedMemory.assistant_response}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-2">
                        {selectedMemory.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedMemory.memory_type === 'context' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          selectedMemory.memory_type === 'pattern' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          selectedMemory.memory_type === 'decision' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {selectedMemory.memory_type}
                        </span>
                        <span>•</span>
                        <span>Relevance: {Math.round(selectedMemory.relevance_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Content:</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 text-sm whitespace-pre-wrap">
                      {selectedMemory.content}
                    </div>
                  </div>
                  
                  {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMemory.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <div>Project: {selectedMemory.project_identifier}</div>
                    <div>Updated: {formatDate(selectedMemory.updated_at)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}