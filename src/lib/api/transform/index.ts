import { ApiHandlerOptions } from '../../../types/providers'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface Tool {
  name: string
  description?: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

// Base transformer interface
export interface MessageTransformer {
  transformRequest(options: ApiHandlerOptions): any
  transformResponse(response: any): any
  transformStreamChunk(chunk: string): any
}

// OpenAI format transformer (used by OpenAI, Azure, OpenRouter, etc.)
export class OpenAITransformer implements MessageTransformer {
  transformRequest(options: ApiHandlerOptions): any {
    const { messages, model, maxTokens, temperature, tools } = options
    
    const openAIMessages = (messages || []).map(msg => ({
      role: msg.role,
      content: this.transformMessageContent(msg.content)
    }))
    
    // GPT-5 models require specific temperature handling
    const isGPT5Model = model && (model === 'gpt-5' || model.includes('gpt-5'))
    const finalTemperature = isGPT5Model ? 1 : temperature
    
    const request: any = {
      model,
      messages: openAIMessages,
      max_tokens: maxTokens,
      temperature: finalTemperature,
      stream: true
    }
    
    if (tools && tools.length > 0) {
      request.tools = tools.map((tool: Tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema
        }
      }))
    }
    
    return request
  }
  
  transformResponse(response: any): any {
    return response
  }
  
  transformStreamChunk(chunk: string): any {
    if (chunk.startsWith('data: ')) {
      const data = chunk.slice(6).trim()
      if (data === '[DONE]') {
        return { type: 'done' }
      }
      
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta
        
        if (delta?.content) {
          return {
            type: 'content',
            content: delta.content
          }
        }
        
        if (delta?.tool_calls) {
          const toolCall = delta.tool_calls[0]
          return {
            type: 'tool_use',
            toolUse: {
              id: toolCall.id,
              name: toolCall.function?.name,
              input: toolCall.function?.arguments
            }
          }
        }
        
        return null
      } catch (error) {
        console.error('Failed to parse SSE chunk:', error)
        return null
      }
    }
    
    return null
  }
  
  private transformMessageContent(content: string | MessageContent[]): any {
    if (typeof content === 'string') {
      return content
    }
    
    return content.map(item => {
      if (item.type === 'text') {
        return { type: 'text', text: item.text }
      } else if (item.type === 'image') {
        return {
          type: 'image_url',
          image_url: {
            url: `data:${item.source?.media_type};base64,${item.source?.data}`
          }
        }
      }
      return item
    })
  }
}

// Anthropic format transformer
export class AnthropicTransformer implements MessageTransformer {
  transformRequest(options: ApiHandlerOptions): any {
    const { messages, model, maxTokens, temperature, tools } = options
    
    // Separate system message from other messages
    let systemMessage = ''
    const anthropicMessages = (messages || [])
      .filter(msg => {
        if (msg.role === 'system') {
          systemMessage = typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || ''
          return false
        }
        return true
      })
      .map(msg => ({
        role: msg.role,
        content: this.transformMessageContent(msg.content)
      }))
    
    const request: any = {
      model,
      messages: anthropicMessages,
      max_tokens: maxTokens,
      temperature,
      stream: true
    }
    
    if (systemMessage) {
      request.system = systemMessage
    }
    
    if (tools && tools.length > 0) {
      request.tools = tools
    }
    
    return request
  }
  
  transformResponse(response: any): any {
    return response
  }
  
  transformStreamChunk(chunk: string): any {
    if (chunk.startsWith('data: ')) {
      const data = chunk.slice(6).trim()
      
      try {
        const parsed = JSON.parse(data)
        
        if (parsed.type === 'content_block_delta') {
          return {
            type: 'content',
            content: parsed.delta?.text || ''
          }
        }
        
        if (parsed.type === 'tool_use') {
          return {
            type: 'tool_use',
            toolUse: {
              id: parsed.id,
              name: parsed.name,
              input: parsed.input
            }
          }
        }
        
        if (parsed.type === 'message_stop') {
          return { type: 'done' }
        }
        
        return null
      } catch (error) {
        console.error('Failed to parse Anthropic SSE chunk:', error)
        return null
      }
    }
    
    return null
  }
  
  private transformMessageContent(content: string | MessageContent[]): any {
    if (typeof content === 'string') {
      return content
    }
    
    return content.map(item => {
      if (item.type === 'text') {
        return { type: 'text', text: item.text }
      } else if (item.type === 'image') {
        return {
          type: 'image',
          source: item.source
        }
      }
      return item
    })
  }
}

// Google AI format transformer
export class GoogleTransformer implements MessageTransformer {
  transformRequest(options: ApiHandlerOptions): any {
    const { messages, model, maxTokens, temperature, tools } = options
    
    // Convert messages to Google format
    const contents = (messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: this.transformMessageContent(msg.content)
    }))
    
    const request: any = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature
      }
    }
    
    if (tools && tools.length > 0) {
      request.tools = [{ functionDeclarations: tools }]
    }
    
    return request
  }
  
  transformResponse(response: any): any {
    // Ensure consistent Google response format
    if (response.candidates) {
      // Handle both array and non-array candidates
      if (!Array.isArray(response.candidates)) {
        response.candidates = [response.candidates]
      }
    }
    return response
  }
  
  transformStreamChunk(chunk: string): any {
    try {
      const lines = chunk.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))
          
          // Handle candidates more robustly - could be array or single object
          let candidate = null
          if (data.candidates) {
            if (Array.isArray(data.candidates)) {
              candidate = data.candidates[0]
            } else {
              candidate = data.candidates
            }
          }
          
          if (candidate?.content?.parts) {
            const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [candidate.content.parts]
            const text = parts[0]?.text
            if (text) {
              return {
                type: 'content',
                content: text
              }
            }
          }
          
          if (candidate?.finishReason) {
            return { type: 'done' }
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to parse Google SSE chunk:', error)
      return null
    }
  }
  
  private transformMessageContent(content: string | MessageContent[]): any[] {
    if (typeof content === 'string') {
      return [{ text: content }]
    }
    
    return content.map(item => {
      if (item.type === 'text') {
        return { text: item.text }
      } else if (item.type === 'image') {
        return {
          inlineData: {
            mimeType: item.source?.media_type,
            data: item.source?.data
          }
        }
      }
      return { text: String(item) }
    })
  }
}

// Factory function to get the appropriate transformer
export function getTransformer(providerId: string): MessageTransformer {
  switch (providerId) {
    case 'anthropic':
    case 'bedrock': // Bedrock uses Anthropic format for Claude models
      return new AnthropicTransformer()
    
    case 'google':
    case 'vertex':
      return new GoogleTransformer()
    
    case 'openai':
    case 'azure':
    case 'openrouter':
    case 'deepseek':
    case 'xai':
    case 'groq':
    case 'fireworks':
    case 'together':
    case 'cerebras':
    case 'codex-cli':
    case 'github-copilot':
    default:
      return new OpenAITransformer()
  }
}