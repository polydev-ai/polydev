'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardModels, type DashboardModel } from '../../hooks/useDashboardModels'
import { useChatSessions, type ChatSession, type ChatMessage } from '../../hooks/useChatSessions'
import { usePreferences } from '../../hooks/usePreferences'
import MessageContent from '../../components/MessageContent'

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
}

export default function Chat() {
  const { user, loading, isAuthenticated } = useAuth()
  const { models: dashboardModels, loading: modelsLoading, error: modelsError, hasModels } = useDashboardModels()
  const { 
    sessions, 
    loading: sessionsLoading, 
    error: sessionsError, 
    createSession, 
    getSessionWithMessages 
  } = useChatSessions()
  const { preferences, updatePreferences } = usePreferences()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Set default selected models when dashboard models load and preferences are available
  useEffect(() => {
    if (dashboardModels.length > 0 && selectedModels.length === 0) {
      // Check if user has saved chat model preferences
      const savedChatModels = preferences?.mcp_settings?.saved_chat_models
      
      if (savedChatModels && Array.isArray(savedChatModels) && savedChatModels.length > 0) {
        // Restore saved model preferences, filtering out models that are no longer available
        const availableModelIds = dashboardModels.map(m => m.id)
        const validSavedModels = savedChatModels.filter(modelId => availableModelIds.includes(modelId))
        
        if (validSavedModels.length > 0) {
          setSelectedModels(validSavedModels)
          return
        }
      }
      
      // Fall back to default selection if no saved preferences or invalid models
      const modelsByTier = dashboardModels.reduce((acc, model) => {
        if (!acc[model.tier]) acc[model.tier] = []
        acc[model.tier].push(model)
        return acc
      }, {} as Record<'cli' | 'api' | 'credits', DashboardModel[]>)

      const defaults: string[] = []
      if (modelsByTier.cli?.length > 0) defaults.push(modelsByTier.cli[0].id)
      if (modelsByTier.api?.length > 0 && defaults.length < 2) defaults.push(modelsByTier.api[0].id)
      if (modelsByTier.credits?.length > 0 && defaults.length === 0) defaults.push(modelsByTier.credits[0].id)
      setSelectedModels(defaults)
    }
  }, [dashboardModels, selectedModels.length, preferences])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const convertChatMessage = (chatMsg: ChatMessage): Message => ({
    id: chatMsg.id,
    role: chatMsg.role,
    content: chatMsg.content,
    model: chatMsg.model_id,
    timestamp: new Date(chatMsg.created_at),
    provider: chatMsg.provider_info?.provider,
    usage: chatMsg.usage_info,
    costInfo: chatMsg.cost_info,
    fallbackMethod: chatMsg.metadata?.fallback_method,
    creditsUsed: chatMsg.metadata?.credits_used
  })

  const loadSession = async (session: ChatSession) => {
    const sessionWithMessages = await getSessionWithMessages(session.id)
    if (sessionWithMessages) {
      setCurrentSession(session)
      const converted = sessionWithMessages.chat_messages.map(convertChatMessage)
      setMessages(converted)
      setShowSidebar(false)
    }
  }

  const startNewSession = async () => {
    const newSession = await createSession()
    if (newSession) {
      setCurrentSession(newSession)
      setMessages([])
      setShowSidebar(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

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

    try {
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages,
          models: selectedModels,
          temperature: 0.7,
          session_id: sessionId
        }),
      })

      if (!response.ok) throw new Error(`HTTP error ${response.status}`)

      const data = await response.json()
      if (data?.error) throw new Error(data.error)

      if (data?.polydev_metadata?.session_id && !currentSession) {
        const sid = data.polydev_metadata.session_id
        const session = sessions.find(s => s.id === sid) || {
          id: sid,
          title: 'New Chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false
        }
        setCurrentSession(session)
      }

      const responses: any[] = Array.isArray(data?.responses) ? data.responses : []
      if (responses.length > 0) {
        const assistantMessages: Message[] = responses.map((resp: any) => {
          const model = dashboardModels.find(m => m.id === resp.model)
          return {
            id: `${Date.now()}-${resp.model}-${user?.id ?? 'anon'}`,
            role: 'assistant',
            content: typeof resp.content === 'string' ? resp.content : String(resp.content),
            model: model?.name || resp.model,
            timestamp: new Date(),
            provider: resp.provider,
            usage: resp.usage,
            costInfo: resp.cost ? {
              input_cost: resp.cost.input,
              output_cost: resp.cost.output,
              total_cost: resp.cost.total
            } : undefined,
            fallbackMethod: resp.fallback_method,
            creditsUsed: resp.credits_used
          }
        })
        setMessages(prev => [...prev, ...assistantMessages])
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
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
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
        console.error('Failed to save model preferences:', error)
        // Continue silently - user can still use the interface
      }
    }
  }

  const getTierBadgeColor = (tier: 'cli' | 'api' | 'credits') => {
    switch (tier) {
      case 'cli':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'api':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'credits':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    }
  }

  const getSourceFromProvider = (provider?: string):
    | { type: 'cli' | 'api' | 'credits'; label: string; cost?: string }
    | null => {
    if (!provider) return null
    if (provider.includes('CLI')) return { type: 'cli', label: 'CLI', cost: '$0.00' }
    if (provider.includes('API')) return { type: 'api', label: 'API' }
    if (provider.includes('Credits')) return { type: 'credits', label: 'Credits' }
    return null
  }

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null || cost === 0) return '$0.00'
    if (cost < 0.0001) return '<$0.0001'
    return `$${cost.toFixed(4)}`
  }

  const formatDetailedCost = (costInfo?: { input_cost: number; output_cost: number; total_cost: number }) => {
    if (!costInfo) return null
    
    const input = formatCost(costInfo.input_cost)
    const output = formatCost(costInfo.output_cost)
    const total = formatCost(costInfo.total_cost)
    
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500" title={`Input: ${input} • Output: ${output} • Total: ${total}`}>
        {input} in • {output} out • {total} total
      </span>
    )
  }

  const clearChat = () => {
    startNewSession()
  }

  // Group messages by conversation turns for split view
  const groupMessagesByTurns = () => {
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
  }

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
            className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Chat
          </button>

          {sessionsError && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              Failed to load sessions: {sessionsError}
            </div>
          )}
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                <div className="text-sm font-medium truncate">{session.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
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
                                const model = dashboardModels.find(m => m.name === message.model)
                                const providerName = model?.providerName || (message.provider?.replace(/\s+\(.+\)/, '') || 'AI')
                                return (
                                  <div className="flex items-center space-x-2">
                                    {model?.providerLogo ? (
                                      <img 
                                        src={model.providerLogo} 
                                        alt={providerName}
                                        className="w-6 h-6 rounded-lg flex-shrink-0 object-contain"
                                        onError={(e) => {
                                          // Fallback to gradient placeholder on error
                                          e.currentTarget.style.display = 'none'
                                          const fallback = e.currentTarget.nextElementSibling
                                          if (fallback) fallback.style.display = 'flex'
                                        }}
                                      />
                                    ) : null}
                                    <div className={`w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 ${model?.providerLogo ? 'hidden' : ''}`}>
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
                                const source = getSourceFromProvider(message.provider)
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
                      <div className={`px-6 py-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}>
                        <MessageContent 
                          content={message.content}
                          className={message.role === 'user' ? 'text-white' : ''}
                        />
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
                groupMessagesByTurns().map((turn, turnIndex) => (
                  <div key={turnIndex} className="space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-3xl ml-auto">
                        <div className="px-6 py-4 rounded-2xl bg-blue-600 text-white">
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
                                    const model = dashboardModels.find(m => m.name === message.model)
                                    const providerName = model?.providerName || (message.provider?.replace(/\s+\(.+\)/, '') || 'AI')
                                    return (
                                      <>
                                        {model?.providerLogo ? (
                                          <img 
                                            src={model.providerLogo} 
                                            alt={providerName}
                                            className="w-6 h-6 rounded-lg flex-shrink-0 object-contain"
                                            onError={(e) => {
                                              // Fallback to gradient placeholder on error
                                              e.currentTarget.style.display = 'none'
                                              const fallback = e.currentTarget.nextElementSibling
                                              if (fallback) fallback.style.display = 'flex'
                                            }}
                                          />
                                        ) : null}
                                        <div className={`w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 ${model?.providerLogo ? 'hidden' : ''}`}>
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
                                    const source = getSourceFromProvider(message.provider)
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
              
              {isLoading && (
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
                                    // Fallback to gradient placeholder on error
                                    e.currentTarget.style.display = 'none'
                                    const fallback = e.currentTarget.nextElementSibling
                                    if (fallback) fallback.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div className={`w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 ${model.providerLogo ? 'hidden' : ''}`}>
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
                      disabled={selectedModels.length === 0 || isLoading}
                      className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || selectedModels.length === 0 || isLoading}
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