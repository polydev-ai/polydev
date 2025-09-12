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
    const events: any[] = []
    try {
      const emitFromData = (data: any) => {
        const items: any[] = []
        // Handle array of responses (some implementations batch multiple)
        if (Array.isArray(data)) {
          for (const obj of data) {
            items.push(...emitFromData(obj))
          }
          return items
        }
        // Single response object
        const candidate = Array.isArray(data?.candidates) ? data.candidates[0] : data?.candidates
        if (candidate?.content?.parts) {
          const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [candidate.content.parts]
          for (const p of parts) {
            if (typeof p?.text === 'string' && p.text.length) {
              items.push({ type: 'content', content: p.text })
            }
          }
        }
        if (candidate?.finishReason) {
          items.push({ type: 'done' })
        }
        return items
      }

      // Support normalized 'data: <json>' lines
      if (chunk.startsWith('data: ')) {
        const raw = chunk.slice(6).trim()
        if (raw === '[DONE]') return { type: 'done' }
        const data = JSON.parse(raw)
        const items = emitFromData(data)
        if (items.length === 1) return items[0]
        if (items.length > 1) return items
        return null
      }

      // Raw JSON fallback (some transports send JSON-lines)
      const trimmed = chunk.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const data = JSON.parse(trimmed)
        const items = emitFromData(data)
        if (items.length === 1) return items[0]
        if (items.length > 1) return items
        return null
      }

      // Multi-line fallback: scan for embedded data lines
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        if (!line) continue
        if (line === 'data: [DONE]') return { type: 'done' }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6).trim())
            const items = emitFromData(data)
            events.push(...items)
          } catch {}
        }
      }
      if (events.length === 1) return events[0]
      if (events.length > 1) return events
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
