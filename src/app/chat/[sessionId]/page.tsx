'use client'

import { useState, useRef, useEffect, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useChatModels } from '../../../hooks/useChatModels'
import { type DashboardModel } from '../../../hooks/useDashboardModels'
import { useChatSessions, type ChatSession, type ChatMessage } from '../../../hooks/useChatSessions'
import { usePreferences } from '../../../hooks/usePreferences'
import MessageContent from '../../../components/MessageContent'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  timestamp: Date
  provider?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  costInfo?: {
    input_cost: number
    output_cost: number
    total_cost: number
  }
  fallbackMethod?: string
  creditsUsed?: number
  responseTime?: number // in milliseconds
  reasoning?: {
    content: string
    tokens: number
  }
}

export default function Chat() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const { user, loading, isAuthenticated } = useAuth()
  const { models: dashboardModels, loading: modelsLoading, error: modelsError, hasModels, refresh: refreshModels } = useChatModels()
  const { 
    sessions, 
    loading: sessionsLoading, 
    error: sessionsError, 
    createSession, 
    getSessionWithMessages,
    deleteSession
  } = useChatSessions()
  const { preferences, updatePreferences } = usePreferences()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('split')
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set())
  const [streamingResponses, setStreamingResponses] = useState<Record<string, string>>({})
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Set selected models from model preferences (top X models based on order)
  useEffect(() => {
    if (dashboardModels.length > 0 && preferences) {
      // Get max number of chat models to show (default to 3)
      const maxChatModels = preferences.mcp_settings?.max_chat_models || 3

      // Check if we have saved chat models preference
      const savedChatModels = preferences.mcp_settings?.saved_chat_models
      if (savedChatModels && savedChatModels.length > 0) {
        // Filter saved models to only include those that are still configured
        const validSavedModels = savedChatModels.filter(modelId =>
          dashboardModels.some(model => model.id === modelId && model.isConfigured)
        )

        if (validSavedModels.length > 0) {
          setSelectedModels(validSavedModels)
          return
        }
      }

      // Extract top X models from model_preferences ordered by priority
      const modelPreferences = preferences.model_preferences || {}

      // Get all provider entries sorted by order
      const sortedProviders = Object.entries(modelPreferences)
        .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))

      // Extract model IDs from sorted providers
      const topModels: string[] = []
      for (const [provider, config] of sortedProviders) {
        if (topModels.length >= maxChatModels) break

        // Add models from this provider
        for (const modelId of config.models || []) {
          if (topModels.length >= maxChatModels) break

          // Check if model is configured in dashboard
          const model = dashboardModels.find(m => m.id === modelId && m.isConfigured)
          if (model) {
            topModels.push(modelId)
          }
        }
      }

      if (topModels.length > 0) {
        setSelectedModels(topModels)
      } else {
        // Final fallback: Get top X configured models
        const configuredModels = dashboardModels
          .filter(model => model.isConfigured)
          .slice(0, maxChatModels)
          .map(m => m.id)
        setSelectedModels(configuredModels)
      }
    }
  }, [dashboardModels, preferences])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Refresh models when page becomes visible (e.g., user switches back from models page)
  useEffect(() => {
    let throttleTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = async () => {
      if (!document.hidden && refreshModels) {
        // Throttle to prevent excessive calls
        if (throttleTimeout) return

        throttleTimeout = setTimeout(() => {
          throttleTimeout = null
        }, 1000)

        // Only refresh if models were actually changed (avoid unnecessary API calls)
        const lastUpdate = localStorage.getItem('models_last_update')
        const currentModelsCount = localStorage.getItem('models_count')
        const actualModelsCount = dashboardModels.length.toString()

        if (lastUpdate && currentModelsCount !== actualModelsCount) {
          await refreshModels()
          localStorage.setItem('models_count', actualModelsCount)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (throttleTimeout) clearTimeout(throttleTimeout)
    }
  }, [refreshModels, dashboardModels.length])

  // Load specific session based on sessionId parameter
  useEffect(() => {
    const loadSpecificSession = async () => {
      if (sessionId === 'new') {
        // Create a new session automatically, but only if we don't already have a current session and aren't already creating one
        if (!currentSession && !isCreatingSession) {
          await startNewSession()
        }
      } else if (sessionId && !sessionsLoading) {
        // Only proceed if we have sessions loaded or if we're looking for a specific session
        if (sessions.length > 0) {
          const targetSession = sessions.find(session => session.id === sessionId)
          if (targetSession) {
            // Only load if it's different from current session
            if (!currentSession || currentSession.id !== targetSession.id) {
              await loadSession(targetSession)
            }
          } else {
            // Session not found in loaded sessions - try to fetch it directly
            const sessionWithMessages = await getSessionWithMessages(sessionId)
            if (sessionWithMessages) {
              setCurrentSession(sessionWithMessages)
              const converted = sessionWithMessages.chat_messages.map(convertChatMessage)
              setMessages(converted)
            } else {
              // Session truly doesn't exist, redirect to new session
              router.push('/chat/new')
            }
          }
        } else if (!sessionsLoading) {
          // No sessions loaded and not loading - try to fetch the specific session
          const sessionWithMessages = await getSessionWithMessages(sessionId)
          if (sessionWithMessages) {
            setCurrentSession(sessionWithMessages)
            const converted = sessionWithMessages.chat_messages.map(convertChatMessage)
            setMessages(converted)
          } else {
            // Session doesn't exist, redirect to new session
            router.push('/chat/new')
          }
        }
      }
    }

    loadSpecificSession()
  }, [sessionId, sessions, sessionsLoading, currentSession?.id, isCreatingSession])

  const convertChatMessage = useCallback((chatMsg: ChatMessage): Message => ({
    id: chatMsg.id,
    role: chatMsg.role,
    content: chatMsg.content,
    model: chatMsg.model_id,
    timestamp: new Date(chatMsg.created_at),
    provider: chatMsg.provider_info?.provider,
    usage: chatMsg.usage_info,
    costInfo: chatMsg.cost_info,
    fallbackMethod: (chatMsg.metadata as any)?.fallback_method || (chatMsg.provider_info as any)?.fallback_method,
    creditsUsed: chatMsg.metadata?.credits_used
  }), [])

  const loadSession = async (session: ChatSession) => {
    const sessionWithMessages = await getSessionWithMessages(session.id)
    if (sessionWithMessages) {
      setCurrentSession(session)
      const converted = sessionWithMessages.chat_messages.map(convertChatMessage)
      setMessages(converted)
    }
  }

  const startNewSession = async () => {
    // Prevent multiple session creation attempts
    if (isCreatingSession) return
    
    setIsCreatingSession(true)
    try {
      const newSession = await createSession()
      if (newSession) {
        setCurrentSession(newSession)
        setMessages([])
        // Navigate to the new session URL
        router.push(`/chat/${newSession.id}`)
      }
    } finally {
      setIsCreatingSession(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isStreaming) return

    let sessionId = currentSession?.id
    if (!sessionId) {
      const newSession = await createSession()
      if (newSession) {
        setCurrentSession(newSession)
        sessionId = newSession.id
      }
    }
    if (!sessionId) return

    const userMessage: Message = {
      id: `${Date.now()}-${user?.id ?? 'anon'}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingResponses({})
    
    const startTime = Date.now()
    
    // Create placeholder messages for each model to show loading state
    const placeholderMessages: Message[] = selectedModels.map((modelId, index) => {
      const model = dashboardModels.find(m => m.id === modelId)
      return {
        id: `streaming-${modelId}-${Date.now()}`,
        role: 'assistant',
        content: '',
        model: modelId,
        timestamp: new Date(),
        provider: model?.provider || 'unknown'
      }
    })
    
    setMessages(prev => [...prev, ...placeholderMessages])

    try {
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages,
          models: selectedModels,
          temperature: 0.7,
          session_id: sessionId,
          stream: true
        }),
      })

      if (!response.ok) throw new Error(`HTTP error ${response.status}`)

      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                
                if (parsed.type === 'content' && parsed.model && parsed.content) {
                  // Update streaming response
                  setStreamingResponses(prev => ({
                    ...prev,
                    [parsed.model]: (prev[parsed.model] || '') + parsed.content
                  }))
                  
                  // Update the placeholder message with streaming content
                  setMessages(prev => prev.map(msg => {
                    if (msg.id.startsWith(`streaming-${parsed.model}-`)) {
                      return {
                        ...msg,
                        content: (prev.find(m => m.id === msg.id)?.content || '') + parsed.content,
                        // Attach fallback method as soon as we learn it from stream
                        fallbackMethod: (parsed.fallback_method as any) || msg.fallbackMethod,
                        provider: parsed.provider || msg.provider
                      }
                    }
                    return msg
                  }))
                } else if (parsed.type === 'final' && parsed.responses) {
                  // Replace placeholder messages with final responses
                  const responseTime = Date.now() - startTime
                  const responses = parsed.responses
                  
                  setMessages(prev => {
                    // Remove placeholder messages
                    const withoutPlaceholders = prev.filter(msg => 
                      !msg.id.startsWith('streaming-')
                    )
                    
                    // Add final responses
                    const assistantMessages: Message[] = responses.map((resp: any) => {
                      const model = dashboardModels.find(m => m.id === resp.model)
                      return {
                        id: `${Date.now()}-${resp.model}-${user?.id ?? 'anon'}`,
                        role: 'assistant',
                        content: typeof resp.content === 'string' ? resp.content : String(resp.content),
                        model: resp.model,
                        timestamp: new Date(),
                        provider: resp.provider,
                        usage: resp.usage,
                        costInfo: resp.cost ? {
                          input_cost: resp.cost.input_cost,
                          output_cost: resp.cost.output_cost,
                          total_cost: resp.cost.total_cost
                        } : undefined,
                        fallbackMethod: resp.fallback_method,
                        creditsUsed: resp.credits_used,
                        responseTime: responseTime,
                        reasoning: resp.reasoning ? {
                          content: resp.reasoning.content || '',
                          tokens: resp.reasoning.tokens || 0
                        } : undefined
                      }
                    })
                    
                    return [...withoutPlaceholders, ...assistantMessages]
                  })
                }
              } catch (parseError) {
                // Silently handle parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, there was an error processing your request: ${msg}. Please try again.`,
        model: 'System',
        timestamp: new Date()
      }
      
      // Remove placeholder messages and add error message
      setMessages(prev => [
        ...prev.filter(msg => !msg.id.startsWith('streaming-')),
        errorMessage
      ])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingResponses({})
    }
  }

  const toggleModel = async (modelId: string) => {
    const newSelectedModels = selectedModels.includes(modelId) 
      ? selectedModels.filter(id => id !== modelId) 
      : [...selectedModels, modelId]
    
    setSelectedModels(newSelectedModels)
    
    // Save to user preferences
    if (updatePreferences && preferences) {
      try {
        await updatePreferences({
          mcp_settings: {
            ...preferences.mcp_settings,
            saved_chat_models: newSelectedModels
          }
        })
      } catch (error) {
        // Continue silently - user can still use the interface
      }
    }
  }

  const getTierBadgeColor = useCallback((tier: 'cli' | 'api' | 'admin' | 'premium' | 'normal' | 'eco') => {
    switch (tier) {
      case 'cli':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'api':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'admin':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'premium':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'eco':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
  }, [])

  const getSourceFromProvider = useCallback((
    provider?: string,
    modelId?: string,
    fallbackMethod?: 'cli' | 'api' | 'admin',
    creditsUsed?: number
  ):
    | { type: 'cli' | 'api' | 'admin' | 'premium' | 'normal' | 'eco'; label: string; cost?: string }
    | null => {
    // Prefer explicit fallback method from server
    if (fallbackMethod) {
      return { type: fallbackMethod, label: fallbackMethod.toUpperCase(), cost: fallbackMethod === 'cli' ? '$0.00' : undefined }
    }
    // Backward-compatible: infer Admin (Perspectives) if creditsUsed > 0
    if (typeof creditsUsed === 'number' && creditsUsed > 0) {
      return { type: 'admin', label: 'ADMIN' }
    }
    if (!provider) return null

    // Check explicit provider suffixes first
    if (provider.includes('(CLI)') || provider.includes('CLI')) return { type: 'cli', label: 'CLI', cost: '$0.00' }
    if (provider.includes('(API)') || provider.includes('API')) return { type: 'api', label: 'API' }
    if (provider.includes('(Admin)') || provider.includes('Admin') || provider.includes('(Perspectives)') || provider.includes('Perspectives')) {
      return { type: 'admin', label: 'ADMIN' }
    }

    // Try to match with dashboard models for better accuracy
    if (modelId) {
      const model = dashboardModels.find(m => m.id === modelId || m.name === modelId)
      if (model) {
        return { type: model.tier, label: model.tier.toUpperCase() }
      }
    }

    // Fallback: assume API for most providers
    return { type: 'api', label: 'API' }
  }, [dashboardModels])

  const formatCost = useCallback((cost?: number) => {
    if (cost === undefined || cost === null || cost === 0) return '$0.0000'
    if (cost < 0.000001) return '<$0.0001'
    if (cost < 0.01) return `$${cost.toFixed(6)}`
    return `$${cost.toFixed(4)}`
  }, [])

  const formatDetailedCost = useCallback((costInfo?: { input_cost: number; output_cost: number; total_cost: number }) => {
    if (!costInfo) return null

    const input = formatCost(costInfo.input_cost)
    const output = formatCost(costInfo.output_cost)
    const total = formatCost(costInfo.total_cost)

    return (
      <span className="text-xs text-gray-400 dark:text-gray-500" title={`Input: ${input} • Output: ${output} • Total: ${total}`}>
        {input} in • {output} out • {total} total
      </span>
    )
  }, [formatCost])

  const clearChat = useCallback(() => {
    startNewSession()
  }, [startNewSession])

  const toggleReasoning = useCallback((messageId: string) => {
    const newExpanded = new Set(expandedReasoning)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedReasoning(newExpanded)
  }, [expandedReasoning])

  // Group messages by conversation turns for split view - memoized for performance
  const groupedMessageTurns = useMemo(() => {
    if (viewMode !== 'split' || messages.length === 0) {
      return [] // Skip computation if not needed
    }

    const turns: Array<{
      userMessage: Message
      assistantMessages: Message[]
    }> = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (message.role === 'user') {
        const assistantMessages: Message[] = []
        let j = i + 1

        // Collect all assistant messages that follow this user message
        while (j < messages.length && messages[j].role === 'assistant') {
          assistantMessages.push(messages[j])
          j++
        }

        turns.push({
          userMessage: message,
          assistantMessages
        })

        i = j - 1 // Skip the assistant messages we just processed
      }
    }

    return turns
  }, [messages, viewMode])

  if (loading || modelsLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to access the multi-model chat interface.</p>
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Session Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat History</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={startNewSession}
            disabled={isCreatingSession}
            className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform"
          >
            {isCreatingSession ? 'Creating...' : 'New Chat'}
          </button>

          {sessionsError && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              Failed to load sessions: {sessionsError}
            </div>
          )}
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session) => (
              <div key={session.id} className={`group flex items-center justify-between p-2 rounded-lg transition-colors ${
                currentSession?.id === session.id
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
              }`}>
                <button
                  onClick={() => router.push(`/chat/${session.id}`)}
                  className="flex-1 text-left"
                >
                  <div className="text-sm font-medium truncate">{session.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!confirm('Delete this conversation?')) return
                    const ok = await deleteSession(session.id)
                    if (ok) {
                      if (currentSession?.id === session.id) {
                        setCurrentSession(null)
                        setMessages([])
                        router.push('/chat/new')
                      }
                    }
                  }}
                  title="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7h8z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-16 z-[90] bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Show chat history"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentSession?.title || 'Polydev Chat'}
                </h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="mr-2">{selectedModels.length} models</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {selectedModels.length > 1 && (
                    <button
                      onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title={viewMode === 'unified' ? 'Switch to split view' : 'Switch to unified view'}
                    >
                      {viewMode === 'unified' ? (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H15a2 2 0 00-2 2" />
                          </svg>
                          Split
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                          Unified
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="New chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Model Selector Dropdown */}
            {showModelSelector && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Your Dashboard Models ({selectedModels.length} selected)
                  </h3>
                  <button
                    onClick={() => setShowModelSelector(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {modelsError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Error loading models: {modelsError}
                    </p>
                  </div>
                )}

                {!hasModels && !modelsError && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      No models configured yet. Go to the <a href="/dashboard/models" className="underline hover:text-blue-800">Models Dashboard</a> to add your API keys and configure models.
                    </p>
                  </div>
                )}

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dashboardModels.map((model) => (
                      <label
                        key={model.id}
                        className={`flex items-start space-x-3 p-4 bg-white dark:bg-gray-700 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedModels.includes(model.id)
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(model.id)}
                          onChange={() => toggleModel(model.id)}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-500 dark:bg-gray-600"
                        />
                        {model.providerLogo ? (
                          <img
                            src={model.providerLogo}
                            alt={model.providerName}
                            className="w-6 h-6 rounded-lg flex-shrink-0 object-contain mt-0.5"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement
                              img.style.display = 'none'
                              const fallback = img.parentElement?.querySelector('.logo-fallback') as HTMLElement
                              if (fallback) fallback.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`logo-fallback w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${model.providerLogo ? 'hidden' : ''}`}>
                          <span className="text-white text-[10px] font-bold">
                            {model.providerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {model.name}
                            </span>
                            {model.features?.supportsImages && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                Vision
                              </span>
                            )}
                            {model.features?.supportsReasoning && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                                Reasoning
                              </span>
                            )}
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getTierBadgeColor(model.tier)}`}>
                              {model.tier.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {model.providerName} • {model.contextWindow ? `${(model.contextWindow / 1000).toFixed(0)}K context` : 'Standard'}
                          </div>
                          {model.price && (
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                ${model.price.input}/1M in
                              </div>
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                ${model.price.output}/1M out
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* Messages */}
            <div className="px-4 py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                      Welcome to Polydev Multi-Model Chat
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                      Get perspectives from your configured dashboard models simultaneously. {hasModels ? 'Select your models above and start chatting.' : 'Configure models in your dashboard to get started.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Compare Models</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        See how different AI models respond to the same prompt
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Routing</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        CLI models prioritized, with API and credit fallbacks
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Real-time</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get responses from all selected models simultaneously
                      </p>
                    </div>
                  </div>
                </div>
              ) : viewMode === 'unified' ? (
                // Unified view - traditional chat layout
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                      {message.role === 'assistant' && message.model && (
                        <div className="mb-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {(() => {
                                const model = dashboardModels.find(m => m.id === message.model || m.name === message.model)
                                const providerName = model?.providerName || (message.provider?.replace(/\s+\(.+\)/, '') || 'AI')
                                
                                
                                return (
                                  <div className="flex items-center space-x-2">
                                    {model?.providerLogo ? (
                                      <img 
                                        src={model.providerLogo} 
                                        alt={providerName}
                                        className="w-6 h-6 rounded-lg flex-shrink-0 object-contain"
                                        onError={(e) => {
                                          const img = e.currentTarget as HTMLImageElement
                                          const fallback = img.parentElement?.querySelector('.logo-fallback') as HTMLElement
                                          img.style.display = 'none'
                                          if (fallback) fallback.classList.remove('hidden')
                                        }}
                                      />
                                    ) : null}
                                    <div className={`logo-fallback w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 ${model?.providerLogo ? 'hidden' : ''}`}>
                                      <span className="text-white text-xs font-bold">
                                        {providerName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {message.model}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {providerName}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const source = getSourceFromProvider(message.provider, message.model, message.fallbackMethod as any, message.creditsUsed)
                                if (source) {
                                  return (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTierBadgeColor(source.type)}`}>
                                      {source.label}
                                    </span>
                                  )
                                }
                                return null
                              })()}
                              {message.usage && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {message.usage.total_tokens} tokens
                                </span>
                              )}
                              {message.responseTime && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {(message.responseTime / 1000).toFixed(1)}s
                                </span>
                              )}
                              {message.costInfo && formatDetailedCost(message.costInfo)}
                              {typeof message.creditsUsed === 'number' && message.creditsUsed > 0 && (
                                <span className="text-xs text-orange-500 dark:text-orange-400">
                                  {message.creditsUsed} credits
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className={`px-6 py-5 rounded-2xl shadow-sm transition-all duration-200 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-100 dark:shadow-blue-900/20'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 shadow-gray-100 dark:shadow-gray-900/20 hover:shadow-md dark:hover:shadow-gray-900/30'
                      }`}>
                        <div className="relative">
                          <MessageContent 
                            content={message.content}
                            className={message.role === 'user' ? 'text-white' : ''}
                          />
                          {isStreaming && message.id.startsWith('streaming-') && (
                            <>
                              {message.content === '' ? (
                                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                  </div>
                                  <span className="text-sm">Thinking...</span>
                                </div>
                              ) : (
                                <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
                              )}
                            </>
                          )}
                        </div>
                        {message.reasoning && message.role === 'assistant' && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button 
                              onClick={() => toggleReasoning(message.id)}
                              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              <svg 
                                className={`w-4 h-4 transform transition-transform ${expandedReasoning.has(message.id) ? 'rotate-90' : ''}`}
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              {expandedReasoning.has(message.id) ? 'Hide' : 'Show'} thinking process
                              <span className="text-xs opacity-70">({message.reasoning.tokens} tokens)</span>
                            </button>
                            {expandedReasoning.has(message.id) && (
                              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                  {message.reasoning.content}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`text-xs mt-2 opacity-70 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Split view - organize by conversation turns and show models side by side
                groupedMessageTurns.map((turn, turnIndex) => (
                  <div key={turnIndex} className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-3xl ml-auto">
                        <div className="px-6 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-100 dark:shadow-blue-900/20">
                          <MessageContent 
                            content={turn.userMessage.content}
                            className="text-white"
                          />
                          <div className="text-xs mt-2 opacity-70 text-blue-100">
                            {turn.userMessage.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Assistant responses in grid */}
                    {turn.assistantMessages.length > 0 && (
                      <div className={`grid gap-4 ${
                        turn.assistantMessages.length === 1 ? 'grid-cols-1' :
                        turn.assistantMessages.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                        'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                      }`}>
                        {turn.assistantMessages.map((message) => (
                          <div key={message.id} className="bg-gray-100 dark:bg-gray-800 rounded-2xl">
                            {/* Model header */}
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {(() => {
                                    const model = dashboardModels.find(m => m.id === message.model || m.name === message.model)
                                    const providerName = model?.providerName || (message.provider?.replace(/\s+\(.+\)/, '') || 'AI')
                                    return (
                                      <>
                                        {model?.providerLogo ? (
                                          <img 
                                            src={model.providerLogo} 
                                            alt={providerName}
                                            className="w-6 h-6 rounded-lg flex-shrink-0 object-contain"
                                            onError={(e) => {
                                              const img = e.currentTarget as HTMLImageElement
                                              const fallback = img.parentElement?.querySelector('.logo-fallback') as HTMLElement
                                              img.style.display = 'none'
                                              if (fallback) fallback.classList.remove('hidden')
                                            }}
                                          />
                                        ) : null}
                                        <div className={`logo-fallback w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 ${model?.providerLogo ? 'hidden' : ''}`}>
                                          <span className="text-white text-xs font-bold">
                                            {providerName.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {message.model}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {providerName}
                                          </div>
                                        </div>
                                      </>
                                    )
                                  })()}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {(() => {
                                    const source = getSourceFromProvider(message.provider, message.model, message.fallbackMethod as any, message.creditsUsed)
                                      if (source) {
                                        return (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTierBadgeColor(source.type)}`}>
                                            {source.label}
                                          </span>
                                        )
                                      }
                                      return null
                                    })()}
                                  {message.usage && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      {message.usage.total_tokens}t
                                    </span>
                                  )}
                                  {message.responseTime && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      {(message.responseTime / 1000).toFixed(1)}s
                                    </span>
                                  )}
                                  {message.costInfo && formatDetailedCost(message.costInfo)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Message content */}
                            <div className="px-6 py-4">
                              <MessageContent 
                                content={message.content}
                                className="text-gray-900 dark:text-white"
                              />
                              {message.reasoning && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <button 
                                    onClick={() => toggleReasoning(message.id)}
                                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                  >
                                    <svg 
                                      className={`w-4 h-4 transform transition-transform ${expandedReasoning.has(message.id) ? 'rotate-90' : ''}`}
                                      fill="currentColor" 
                                      viewBox="0 0 20 20"
                                    >
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {expandedReasoning.has(message.id) ? 'Hide' : 'Show'} thinking process
                                    <span className="text-xs opacity-70">({message.reasoning.tokens} tokens)</span>
                                  </button>
                                  {expandedReasoning.has(message.id) && (
                                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                        {message.reasoning.content}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {(() => {
                const hasStreamingPlaceholders = messages.some(m => m.id.startsWith('streaming-'))
                const showModelsPanel = (isLoading || isStreaming) && !hasStreamingPlaceholders
                return showModelsPanel
              })() && (
                <div className="flex justify-start">
                  <div className="max-w-5xl mr-auto w-full">
                    <div className="mb-2 px-4">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        AI Models
                      </span>
                    </div>
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 rounded-2xl">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="flex space-x-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Getting responses from {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}...
                        </span>
                      </div>
                      
                      {/* Show selected models with their providers */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedModels.map((modelId) => {
                          const model = dashboardModels.find(m => m.id === modelId)
                          if (!model) return null
                          
                          return (
                            <div key={modelId} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                              {model.providerLogo ? (
                                <img 
                                  src={model.providerLogo} 
                                  alt={model.providerName}
                                  className="w-8 h-8 rounded-lg flex-shrink-0 object-contain"
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement
                                    const fallback = img.parentElement?.querySelector('.logo-fallback') as HTMLElement
                                    img.style.display = 'none'
                                    if (fallback) fallback.classList.remove('hidden')
                                  }}
                                />
                              ) : null}
                              <div className={`logo-fallback w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 ${model.providerLogo ? 'hidden' : ''}`}>
                                <span className="text-white text-xs font-bold">
                                  {model.providerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {model.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {model.providerName}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 py-4">
              <div className="relative">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder={selectedModels.length === 0 ? "Select models above to start chatting..." : "Type your message..."}
                      disabled={selectedModels.length === 0 || isLoading || isStreaming}
                      className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || selectedModels.length === 0 || isLoading || isStreaming}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {selectedModels.length === 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Please select at least one model to start chatting.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
