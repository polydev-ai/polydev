'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useChatModels } from '../../../hooks/useChatModels'
import { type DashboardModel } from '../../../hooks/useDashboardModels'
import { useChatSessions, type ChatSession, type ChatMessage } from '../../../hooks/useChatSessions'
import { usePreferences } from '../../../hooks/usePreferences'
import { useEnhancedApiKeysData } from '../../../hooks/useEnhancedApiKeysData'
import MessageContent from '../../../components/MessageContent'
import ChatSessionSidebar from '../../../components/chat/ChatSessionSidebar'

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
  const { apiKeys, cliStatuses, modelTiers } = useEnhancedApiKeysData()
  
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

  // Set selected models using waterfall priority logic
  // Priority: CLI Tools → User API Keys → Admin Keys (with tier + provider priority)
  useEffect(() => {
    if (dashboardModels.length > 0) {
      // Get perspectives_per_message setting (default to 2)
      const perspectivesPerMessage = preferences?.mcp_settings?.perspectives_per_message || 2

      // Check if we have saved chat models preference
      const savedChatModels = preferences?.mcp_settings?.saved_chat_models
      if (savedChatModels && savedChatModels.length > 0) {
        // Filter saved models to only include those that are still configured
        const validSavedModels = savedChatModels.filter(modelId =>
          dashboardModels.some(model => model.id === modelId && model.isConfigured)
        )

        if (validSavedModels.length > 0) {
          // Only update if different to prevent infinite loop
          setSelectedModels(prev => {
            if (JSON.stringify(prev) === JSON.stringify(validSavedModels)) return prev
            return validSavedModels
          })
          return
        }
      }

      // Apply waterfall priority logic
      const priorityModels: string[] = []

      // Get source priority (default: CLI > API > Admin)
      const sourcePriority = preferences?.source_priority || ['cli', 'api', 'admin']

      // Get tier and provider priorities
      const tierPriority = preferences?.mcp_settings?.tier_priority || ['normal', 'eco', 'premium']
      const providerPriority = preferences?.mcp_settings?.provider_priority || []

      for (const source of sourcePriority) {
        if (priorityModels.length >= perspectivesPerMessage) break

        if (source === 'cli') {
          // 1. CLI Tools (highest priority, free)
          const availableCLI = (cliStatuses || []).filter(cli => cli.status === 'available')

          for (const cli of availableCLI) {
            if (priorityModels.length >= perspectivesPerMessage) break

            // Find CLI models in dashboardModels
            const cliModels = dashboardModels.filter(m =>
              m.isConfigured && m.tier === 'cli' && m.provider === cli.provider
            )

            for (const model of cliModels) {
              if (priorityModels.length >= perspectivesPerMessage) break
              if (!priorityModels.includes(model.id)) {
                priorityModels.push(model.id)
              }
            }
          }
        } else if (source === 'api') {
          // 2. User API Keys (sorted by display_order, free)
          const sortedApiKeys = [...(apiKeys || [])].sort((a, b) =>
            (a.display_order ?? 999) - (b.display_order ?? 999)
          )

          for (const apiKey of sortedApiKeys) {
            if (priorityModels.length >= perspectivesPerMessage) break
            if (!apiKey.active) continue

            // Find models for this API key's default_model
            if (apiKey.default_model) {
              const keyModel = dashboardModels.find(m =>
                m.isConfigured &&
                m.id === apiKey.default_model &&
                m.provider === apiKey.provider
              )

              if (keyModel && !priorityModels.includes(keyModel.id)) {
                priorityModels.push(keyModel.id)
              }
            }
          }
        } else if (source === 'admin') {
          // 3. Admin Keys (uses quota, apply tier + provider priority)
          for (const tier of tierPriority) {
            if (priorityModels.length >= perspectivesPerMessage) break

            for (const provider of providerPriority) {
              if (priorityModels.length >= perspectivesPerMessage) break

              // Find admin models for this tier + provider combination
              const adminModels = dashboardModels.filter(m =>
                m.isConfigured &&
                m.tier === tier &&
                m.provider === provider
              )

              for (const model of adminModels) {
                if (priorityModels.length >= perspectivesPerMessage) break
                if (!priorityModels.includes(model.id)) {
                  priorityModels.push(model.id)
                }
              }
            }

            // Also check for any tier models not yet ordered by provider
            const tierModels = dashboardModels.filter(m =>
              m.isConfigured &&
              m.tier === tier &&
              !priorityModels.includes(m.id)
            )

            for (const model of tierModels) {
              if (priorityModels.length >= perspectivesPerMessage) break
              priorityModels.push(model.id)
            }
          }
        }
      }

      // If waterfall found models, use them
      if (priorityModels.length > 0) {
        // Only update if different to prevent infinite loop
        setSelectedModels(prev => {
          if (JSON.stringify(prev) === JSON.stringify(priorityModels)) return prev
          return priorityModels
        })
      } else {
        // Final fallback: Get top N configured models (prioritize admin models for users without API keys)
        const configuredModels = dashboardModels
          .filter(model => model.isConfigured)
          .sort((a, b) => {
            // Prioritize admin models (tier-based) over others
            const aIsAdmin = ['normal', 'eco', 'premium'].includes(a.tier || '')
            const bIsAdmin = ['normal', 'eco', 'premium'].includes(b.tier || '')
            if (aIsAdmin && !bIsAdmin) return -1
            if (!aIsAdmin && bIsAdmin) return 1

            // Within admin models, prioritize by tier (normal > eco > premium)
            if (aIsAdmin && bIsAdmin) {
              const tierOrder = { normal: 0, eco: 1, premium: 2 }
              const aTier = tierOrder[a.tier as keyof typeof tierOrder] ?? 999
              const bTier = tierOrder[b.tier as keyof typeof tierOrder] ?? 999
              return aTier - bTier
            }

            return 0
          })
          .slice(0, perspectivesPerMessage)
          .map(m => m.id)

        // Only update if different to prevent infinite loop
        setSelectedModels(prev => {
          if (JSON.stringify(prev) === JSON.stringify(configuredModels)) return prev
          return configuredModels
        })

        // Log for debugging
        console.log('[Chat] Model selection fallback:', {
          totalModels: dashboardModels.length,
          configuredModels: dashboardModels.filter(m => m.isConfigured).length,
          selectedModels: configuredModels,
          models: dashboardModels.map(m => ({ id: m.id, tier: m.tier, provider: m.provider, isConfigured: m.isConfigured }))
        })
      }
    }
  }, [dashboardModels, preferences, apiKeys, cliStatuses])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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

  const toggleModel = useCallback((modelId: string) => {
    console.log('[Chat] toggleModel called with:', modelId)
    setSelectedModels(prev => {
      const isCurrentlySelected = prev.includes(modelId)
      const newModels = isCurrentlySelected
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
      console.log('[Chat] Model selection changed:', {
        modelId,
        action: isCurrentlySelected ? 'deselected' : 'selected',
        previousCount: prev.length,
        newCount: newModels.length,
        newModels
      })
      return newModels
    })
  }, [])

  const getTierBadgeColor = useCallback((tier: 'cli' | 'api' | 'admin' | 'premium' | 'normal' | 'eco') => {
    switch (tier) {
      case 'cli':
        return 'bg-slate-100 text-slate-900 border border-slate-200'
      case 'api':
        return 'bg-slate-100 text-slate-900 border border-slate-200'
      case 'admin':
        return 'bg-slate-100 text-slate-900 border border-slate-200'
      case 'premium':
        return 'bg-slate-100 text-slate-900 border border-slate-200'
      case 'normal':
        return 'bg-slate-100 text-slate-900 border border-slate-200'
      case 'eco':
        return 'bg-slate-100 text-slate-900 border border-slate-200'
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
      const label = fallbackMethod === 'admin' ? 'PLAN' : fallbackMethod.toUpperCase()
      return { type: fallbackMethod, label, cost: fallbackMethod === 'cli' ? '$0.00' : undefined }
    }
    // Backward-compatible: infer Admin (Perspectives) if creditsUsed > 0
    if (typeof creditsUsed === 'number' && creditsUsed > 0) {
      return { type: 'admin', label: 'PLAN' }
    }
    if (!provider) return null

    // Check explicit provider suffixes first
    if (provider.includes('(CLI)') || provider.includes('CLI')) return { type: 'cli', label: 'CLI', cost: '$0.00' }
    if (provider.includes('(API)') || provider.includes('API')) return { type: 'api', label: 'API' }
    if (provider.includes('(Admin)') || provider.includes('Admin') || provider.includes('(Perspectives)') || provider.includes('Perspectives') || provider.includes('Plan')) {
      return { type: 'admin', label: 'PLAN' }
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
      <span className="text-xs text-slate-600" title={`Input: ${input} • Output: ${output} • Total: ${total}`}>
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

  // Only block on auth loading - let models and sessions load in background
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Authentication Required</h1>
          <p className="text-slate-600 mb-6">Please sign in to access the multi-model chat interface.</p>
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Session Sidebar */}
      <ChatSessionSidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        isCreatingSession={isCreatingSession}
        startNewSession={startNewSession}
        sessionsError={sessionsError}
        sessions={sessions}
        currentSession={currentSession}
        sessionId={sessionId}
        deleteSession={deleteSession}
        setCurrentSession={setCurrentSession}
        setMessages={setMessages}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-16 z-[90] bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowSidebar(true)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                  title="Show chat history"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-slate-900">
                  {currentSession?.title || 'Polydev Chat'}
                </h1>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    disabled={modelsLoading}
                  >
                    {modelsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-600 mr-2"></div>
                        <span className="mr-2">Loading models...</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-2">{selectedModels.length} models</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                  
                  {selectedModels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors pointer-events-auto z-10"
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
                  type="button"
                  onClick={clearChat}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors pointer-events-auto z-10"
                  title="New chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <div className="text-sm text-slate-600">
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Model Selector Dropdown */}
            {showModelSelector && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-900">
                    Your Dashboard Models ({selectedModels.length} selected)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModelSelector(false)}
                    className="p-1 text-slate-600 hover:text-slate-900 pointer-events-auto z-10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {modelsError && (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-900">
                      Error loading models: {modelsError}
                    </p>
                  </div>
                )}

                {!hasModels && !modelsError && (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-900">
                      No models configured yet. Go to the <a href="/dashboard/models" className="underline hover:text-slate-900">Models Dashboard</a> to add your API keys and configure models.
                    </p>
                  </div>
                )}

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dashboardModels.map((model) => (
                      <label
                        key={model.id}
                        className={`flex items-start space-x-3 p-4 bg-white rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedModels.includes(model.id)
                            ? 'border-slate-900 bg-slate-50 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(model.id)}
                          onChange={() => toggleModel(model.id)}
                          className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
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
                        <div className={`logo-fallback w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${model.providerLogo ? 'hidden' : ''}`}>
                          <span className="text-white text-[10px] font-bold">
                            {model.providerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {model.name}
                            </span>
                            {model.features?.supportsImages && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-900 border border-slate-200">
                                Vision
                              </span>
                            )}
                            {model.features?.supportsReasoning && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-900 border border-slate-200">
                                Reasoning
                              </span>
                            )}
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getTierBadgeColor(model.tier)}`}>
                              {model.tier.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mb-1">
                            {model.providerName} • {model.contextWindow ? `${(model.contextWindow / 1000).toFixed(0)}K context` : 'Standard'}
                          </div>
                          {model.price && (
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="text-xs font-medium text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                                ${model.price.input}/1M in
                              </div>
                              <div className="text-xs font-medium text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
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
                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">
                      Welcome to Polydev Multi-Model Chat
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                      Get perspectives from your configured dashboard models simultaneously. {hasModels ? 'Select your models above and start chatting.' : 'Configure models in your dashboard to get started.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    <div className="bg-slate-50 rounded-xl p-6">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Compare Models</h3>
                      <p className="text-sm text-slate-600">
                        See how different AI models respond to the same prompt
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-6">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Smart Routing</h3>
                      <p className="text-sm text-slate-600">
                        CLI models prioritized, with API and credit fallbacks
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-6">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mb-4 mx-auto">
                        <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Real-time</h3>
                      <p className="text-sm text-slate-600">
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
                                    <div className={`logo-fallback w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 ${model?.providerLogo ? 'hidden' : ''}`}>
                                      <span className="text-white text-xs font-bold">
                                        {providerName.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-slate-900">
                                        {message.model}
                                      </div>
                                      <div className="text-xs text-slate-600">
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
                                <span className="text-xs text-slate-600">
                                  {message.usage.total_tokens} tokens
                                </span>
                              )}
                              {message.responseTime && (
                                <span className="text-xs text-slate-600">
                                  {(message.responseTime / 1000).toFixed(1)}s
                                </span>
                              )}
                              {message.costInfo && formatDetailedCost(message.costInfo)}
                              {typeof message.creditsUsed === 'number' && message.creditsUsed > 0 && (
                                <span className="text-xs text-slate-900">
                                  {message.creditsUsed} credits
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className={`px-6 py-5 rounded-2xl shadow-sm transition-all duration-200 ${
                        message.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-900 border border-slate-200 hover:shadow-md'
                      }`}>
                        <div className="relative">
                          <MessageContent 
                            content={message.content}
                            className={message.role === 'user' ? 'text-white' : ''}
                          />
                          {isStreaming && message.id.startsWith('streaming-') && (
                            <>
                              {message.content === '' ? (
                                <div className="flex items-center space-x-1 text-slate-600">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                  </div>
                                  <span className="text-sm">Thinking...</span>
                                </div>
                              ) : (
                                <span className="inline-block w-2 h-5 bg-slate-900 animate-pulse ml-1" />
                              )}
                            </>
                          )}
                        </div>
                        {message.reasoning && message.role === 'assistant' && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => toggleReasoning(message.id)}
                              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 pointer-events-auto z-10"
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
                              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                                  {message.reasoning.content}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`text-xs mt-2 opacity-70 ${
                          message.role === 'user' ? 'text-white' : 'text-slate-600'
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
                        <div className="px-6 py-5 rounded-2xl bg-slate-900 text-white shadow-sm">
                          <MessageContent
                            content={turn.userMessage.content}
                            className="text-white"
                          />
                          <div className="text-xs mt-2 opacity-70 text-white">
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
                          <div key={message.id} className="bg-slate-50 rounded-2xl">
                            {/* Model header */}
                            <div className="px-4 py-3 border-b border-slate-200 bg-white">
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
                                        <div className={`logo-fallback w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 ${model?.providerLogo ? 'hidden' : ''}`}>
                                          <span className="text-white text-xs font-bold">
                                            {providerName.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-slate-900">
                                            {message.model}
                                          </div>
                                          <div className="text-xs text-slate-600">
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
                                    <span className="text-xs text-slate-600">
                                      {message.usage.total_tokens}t
                                    </span>
                                  )}
                                  {message.responseTime && (
                                    <span className="text-xs text-slate-600">
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
                                className="text-slate-900"
                              />
                              {message.reasoning && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => toggleReasoning(message.id)}
                                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 pointer-events-auto z-10"
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
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                      <div className="text-sm text-slate-900 whitespace-pre-wrap font-mono">
                                        {message.reasoning.content}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="text-xs mt-2 text-slate-600">
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
                      <span className="text-xs font-medium text-slate-600">
                        AI Models
                      </span>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="flex space-x-1">
                          <div className="w-3 h-3 bg-slate-900 rounded-full animate-pulse"></div>
                          <div className="w-3 h-3 bg-slate-900 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-3 h-3 bg-slate-900 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          Getting responses from {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}...
                        </span>
                      </div>
                      
                      {/* Show selected models with their providers */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedModels.map((modelId) => {
                          const model = dashboardModels.find(m => m.id === modelId)
                          if (!model) return null

                          return (
                            <div key={modelId} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-slate-200">
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
                              <div className={`logo-fallback w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 ${model.providerLogo ? 'hidden' : ''}`}>
                                <span className="text-white text-xs font-bold">
                                  {model.providerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                  {model.name}
                                </div>
                                <div className="text-xs text-slate-600 truncate">
                                  {model.providerName}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-slate-900 rounded-full animate-ping"></div>
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
          <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t border-slate-200">
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
                      className="w-full px-4 py-3 pr-12 bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[Send Message] Button clicked, input:', input, 'models:', selectedModels.length, 'loading:', isLoading, 'streaming:', isStreaming)
                        sendMessage()
                      }}
                      disabled={!input.trim() || selectedModels.length === 0 || isLoading || isStreaming}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors pointer-events-auto z-10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>

                {selectedModels.length === 0 && (
                  <p className="text-sm text-slate-900 mt-2">
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
