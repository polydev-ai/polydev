import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class GroqHandler {
  private transformer = new OpenAITransformer()
  private baseUrl = 'https://api.groq.com/openai/v1'
  
  private createAbortController(timeoutMs: number = 30000): AbortController {
    // Ensure timeout is valid (not undefined, null, Infinity, or negative)
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 300000) {
      timeoutMs = 30000 // Default to 30 seconds
    }
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller
  }
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const { apiKey } = options
    
    if (!apiKey) {
      throw new Error('API key is required for Groq')
    }
    
    // Use the model ID as provided (model name resolution is handled at the API route level)
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
        const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Groq API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    // Use the createMessage method which already handles mapping
    const response = await this.createMessage(options)
    return response.body || new ReadableStream()
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
          const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      
      return response.ok
    } catch { return false }
  }
}