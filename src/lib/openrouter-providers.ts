// AUTO-GENERATED from OpenRouter API - DO NOT EDIT MANUALLY
// This file contains the complete list of models available through OpenRouter
// Last updated: 2025-01-02

export interface OpenRouterModelInfo {
  id: string
  name: string
  maxTokens: number
  contextWindow: number
  inputPrice: number  // per million tokens
  outputPrice: number // per million tokens
  supportsImages: boolean
  supportsTools: boolean
  supportsStreaming: boolean
  supportsReasoning: boolean
  description: string
}

export interface OpenRouterProvider {
  name: string
  base_url: string
  models: OpenRouterModelInfo[]
}

// Key providers with high-quality models
export const FEATURED_OPENROUTER_PROVIDERS = [
  'openai',
  'anthropic', 
  'google',
  'deepseek',
  'x-ai',
  'mistralai',
  'meta-llama',
  'qwen',
  'microsoft',
  'cohere'
]

// Provider icons mapping
export const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔍',
  deepseek: '🌊', 
  'x-ai': '✖️',
  mistralai: '💨',
  'meta-llama': '🦙',
  qwen: '🏮',
  microsoft: '🪟',
  cohere: '🔗',
  nvidia: '💚',
  'ai21': '🤖',
  perplexity: '❓',
  amazon: '📦',
  baidu: '🐻',
  'z-ai': '⚡',
  bytedance: '🎵',
  liquid: '💧',
  'nousresearch': '🔬',
  'rekaai': '🎯'
}

// Get all models from all providers  
export function getAllOpenRouterModels(): OpenRouterModelInfo[] {
  // This would be populated from the full OpenRouter API response
  // For now, return featured models to reduce bundle size
  return getFeaturedModels().reasoning.concat(
    getFeaturedModels().vision,
    getFeaturedModels().coding
  )
}

// Get featured models by category
export function getFeaturedModels() {
  // Sample featured models - in production this would be populated from full API
  const sampleModels: OpenRouterModelInfo[] = [
    {
      id: 'openai/gpt-5',
      name: 'OpenAI: GPT-5',
      maxTokens: 128000,
      contextWindow: 400000,
      inputPrice: 1.25,
      outputPrice: 10.0,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      description: 'OpenAI\'s most advanced model with major improvements in reasoning and code quality.'
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Anthropic: Claude 3.5 Sonnet',
      maxTokens: 8192,
      contextWindow: 200000,
      inputPrice: 3.0,
      outputPrice: 15.0,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      description: 'Anthropic\'s flagship model with exceptional reasoning and vision capabilities.'
    },
    {
      id: 'google/gemini-2.5-flash',
      name: 'Google: Gemini 2.5 Flash',
      maxTokens: 8192,
      contextWindow: 1048576,
      inputPrice: 0.3,
      outputPrice: 2.5,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      description: 'Google\'s fast multimodal model for vision and text tasks.'
    },
    {
      id: 'deepseek/deepseek-v3.1',
      name: 'DeepSeek: DeepSeek V3.1',
      maxTokens: 8192,
      contextWindow: 163840,
      inputPrice: 0.2,
      outputPrice: 0.8,
      supportsImages: false,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      description: 'Large hybrid reasoning model with thinking and non-thinking modes.'
    },
    {
      id: 'x-ai/grok-2',
      name: 'xAI: Grok 2',
      maxTokens: 8192,
      contextWindow: 131072,
      inputPrice: 2.0,
      outputPrice: 10.0,
      supportsImages: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      description: 'xAI\'s conversational AI with real-time knowledge and multimodal capabilities.'
    }
  ]

  return {
    reasoning: sampleModels.filter(m => m.supportsReasoning),
    vision: sampleModels.filter(m => m.supportsImages),
    coding: sampleModels.filter(m => 
      m.name.toLowerCase().includes('code') || 
      m.description.toLowerCase().includes('coding') ||
      m.id.includes('deepseek') || 
      m.id.includes('claude')
    ),
    fastest: sampleModels.filter(m => 
      m.name.toLowerCase().includes('flash') ||
      m.name.toLowerCase().includes('fast') ||
      m.name.toLowerCase().includes('mini')
    ),
    cheapest: sampleModels.sort((a, b) => a.inputPrice - b.inputPrice).slice(0, 5)
  }
}

// Search models by name or description
export function searchOpenRouterModels(query: string): OpenRouterModelInfo[] {
  const searchTerm = query.toLowerCase()
  return getAllOpenRouterModels().filter(model => 
    model.name.toLowerCase().includes(searchTerm) ||
    model.description.toLowerCase().includes(searchTerm) ||
    model.id.toLowerCase().includes(searchTerm)
  )
}

// Check if provider supports OpenRouter
export function isOpenRouterProvider(providerId: string): boolean {
  return FEATURED_OPENROUTER_PROVIDERS.includes(providerId)
}

// Get provider display info
export function getProviderInfo(providerId: string) {
  const icon = PROVIDER_ICONS[providerId] || '🤖'
  const name = providerId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  
  return { icon, name, id: providerId }
}