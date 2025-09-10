'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardModels, type DashboardModel } from '../../hooks/useDashboardModels'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: Date
}

export default function Chat() {
  const { user, loading, isAuthenticated } = useAuth()
  const { models: dashboardModels, loading: modelsLoading, error: modelsError, hasModels } = useDashboardModels()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [showModelSelector, setShowModelSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Set default selected models when dashboard models load
  useEffect(() => {
    if (dashboardModels.length > 0 && selectedModels.length === 0) {
      // Select the first model from each tier (CLI, API, Credits)
      const modelsByTier = dashboardModels.reduce((acc, model) => {
        if (!acc[model.tier]) {
          acc[model.tier] = []
        }
        acc[model.tier].push(model)
        return acc
      }, {} as Record<string, DashboardModel[]>)

      const defaults: string[] = []
      // Prefer CLI models first
      if (modelsByTier.cli?.length > 0) {
        defaults.push(modelsByTier.cli[0].id)
      }
      // Then API models
      if (modelsByTier.api?.length > 0 && defaults.length < 2) {
        defaults.push(modelsByTier.api[0].id)
      }
      // Then credits models
      if (modelsByTier.credits?.length > 0 && defaults.length === 0) {
        defaults.push(modelsByTier.credits[0].id)
      }
      
      setSelectedModels(defaults)
    }
  }, [dashboardModels, selectedModels.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `${Date.now()}-${user?.id}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMessage],
          models: selectedModels,
          temperature: 0.7
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessages = data.responses.map((resp: any) => {
        const model = dashboardModels.find(m => m.id === resp.model)
        return {
          id: `${Date.now()}-${resp.model}-${user?.id}`,
          role: 'assistant' as const,
          content: resp.content,
          model: model?.name || resp.model,
          timestamp: new Date()
        }
      })

      setMessages(prev => [...prev, ...assistantMessages])
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Show error message to user
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, there was an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        model: 'System',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
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

  const getTierLabel = (tier: 'cli' | 'api' | 'credits') => {
    switch (tier) {
      case 'cli':
        return 'CLI'
      case 'api':
        return 'API'
      case 'credits':
        return 'Credits'
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  if (loading || modelsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to access the multi-model chat interface.
          </p>
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Polydev Chat
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
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearChat}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Clear chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              
              {/* Show error or no models message */}
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
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  // Group dashboard models by tier
                  const modelsByTier = dashboardModels.reduce((acc, model) => {
                    if (!acc[model.tier]) {
                      acc[model.tier] = []
                    }
                    acc[model.tier].push(model)
                    return acc
                  }, {} as Record<string, DashboardModel[]>)

                  return ['cli', 'api', 'credits'].map((tier) => {
                    const models = modelsByTier[tier] || []
                    if (models.length === 0) return null

                    return (
                      <div key={tier} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(tier as 'cli' | 'api' | 'credits')}`}>
                            {getTierLabel(tier as 'cli' | 'api' | 'credits')}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {tier === 'cli' ? 'Highest priority - CLI available' : 
                             tier === 'api' ? 'API key required' : 
                             'Credit-based or free'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {models.map((model) => (
                            <label key={model.id} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
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
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    ${model.price.input}/1M in • ${model.price.output}/1M out
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  }).filter(Boolean)
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto">
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
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                    {message.role === 'assistant' && message.model && (
                      <div className="mb-2 px-4">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {message.model}
                        </span>
                      </div>
                    )}
                    <div className={`px-6 py-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}>
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 opacity-70 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl mr-auto">
                  <div className="mb-2 px-4">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      AI Assistant
                    </span>
                  </div>
                  <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Getting responses from {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
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
  )
}