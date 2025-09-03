// Token Counter Implementation
// Estimates token usage for different providers and models

import { Message } from '../transform'

export interface TokenCount {
  prompt: number
  completion: number
  total: number
}

export class TokenCounter {
  // Approximate token counts per character for different model families
  private static readonly TOKEN_RATIOS = {
    'gpt': 0.25,      // OpenAI models
    'claude': 0.24,   // Anthropic models  
    'gemini': 0.25,   // Google models
    'llama': 0.22,    // Meta/Llama models
    'default': 0.25   // Default fallback
  }
  
  countTokens(messages: Message[], model?: string): number {
    const ratio = this.getTokenRatio(model)
    
    let totalChars = 0
    for (const message of messages) {
      if (typeof message.content === 'string') {
        totalChars += message.content.length
      } else if (Array.isArray(message.content)) {
        for (const content of message.content) {
          if (content.type === 'text' && content.text) {
            totalChars += content.text.length
          }
        }
      }
      
      // Add overhead for role and formatting
      totalChars += 20 // Approximate overhead per message
    }
    
    return Math.ceil(totalChars * ratio)
  }
  
  estimateCompletionTokens(text: string, model?: string): number {
    const ratio = this.getTokenRatio(model)
    return Math.ceil(text.length * ratio)
  }
  
  calculateCost(tokens: TokenCount, model: string, inputPrice: number, outputPrice: number): number {
    // Prices are per million tokens
    const inputCost = (tokens.prompt / 1000000) * inputPrice
    const outputCost = (tokens.completion / 1000000) * outputPrice
    return inputCost + outputCost
  }
  
  private getTokenRatio(model?: string): number {
    if (!model) return TokenCounter.TOKEN_RATIOS.default
    
    const modelLower = model.toLowerCase()
    
    if (modelLower.includes('gpt') || modelLower.includes('openai')) {
      return TokenCounter.TOKEN_RATIOS.gpt
    }
    if (modelLower.includes('claude')) {
      return TokenCounter.TOKEN_RATIOS.claude
    }
    if (modelLower.includes('gemini')) {
      return TokenCounter.TOKEN_RATIOS.gemini
    }
    if (modelLower.includes('llama') || modelLower.includes('meta')) {
      return TokenCounter.TOKEN_RATIOS.llama
    }
    
    return TokenCounter.TOKEN_RATIOS.default
  }
  
  // Advanced token counting for specific providers
  countTokensAdvanced(messages: Message[], model: string, provider: string): TokenCount {
    const promptTokens = this.countTokens(messages, model)
    
    // Provider-specific adjustments
    let adjustedPromptTokens = promptTokens
    
    switch (provider) {
      case 'anthropic':
        // Claude has slightly different tokenization
        adjustedPromptTokens = Math.ceil(promptTokens * 1.05)
        break
      case 'google':
        // Gemini has different tokenization for multimodal content
        adjustedPromptTokens = Math.ceil(promptTokens * 0.95)
        break
      case 'openai':
        // OpenAI is the baseline
        break
      default:
        break
    }
    
    return {
      prompt: adjustedPromptTokens,
      completion: 0, // Will be filled after response
      total: adjustedPromptTokens
    }
  }
  
  // Token counting for tool calls and function usage
  countToolTokens(tools: any[]): number {
    let tokenCount = 0
    
    for (const tool of tools) {
      // Count tokens in function name and description
      if (tool.name) {
        tokenCount += this.estimateCompletionTokens(tool.name)
      }
      if (tool.description) {
        tokenCount += this.estimateCompletionTokens(tool.description)
      }
      
      // Count tokens in schema (approximate)
      if (tool.input_schema || tool.parameters) {
        const schemaStr = JSON.stringify(tool.input_schema || tool.parameters)
        tokenCount += this.estimateCompletionTokens(schemaStr)
      }
    }
    
    return tokenCount
  }
  
  // Estimate context window usage
  estimateContextUsage(messages: Message[], model: string): {
    used: number
    available: number
    percentage: number
  } {
    const usedTokens = this.countTokens(messages, model)
    const contextWindow = this.getContextWindow(model)
    
    return {
      used: usedTokens,
      available: contextWindow - usedTokens,
      percentage: (usedTokens / contextWindow) * 100
    }
  }
  
  private getContextWindow(model: string): number {
    const modelLower = model.toLowerCase()
    
    // Model-specific context windows
    if (modelLower.includes('claude-3.5') || modelLower.includes('claude-3-5')) {
      return 200000
    }
    if (modelLower.includes('claude')) {
      return 200000 // Most Claude models
    }
    if (modelLower.includes('gpt-4o')) {
      return 128000
    }
    if (modelLower.includes('gpt-4')) {
      return 8192 // Original GPT-4
    }
    if (modelLower.includes('gpt-3.5')) {
      return 16385
    }
    if (modelLower.includes('gemini-2.0')) {
      return 1000000
    }
    if (modelLower.includes('gemini-1.5-pro')) {
      return 2000000
    }
    if (modelLower.includes('gemini')) {
      return 1000000
    }
    
    return 4096 // Conservative fallback
  }
}
