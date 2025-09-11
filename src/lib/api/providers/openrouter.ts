import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class OpenRouterHandler {
  private transformer = new OpenAITransformer()
  private baseUrl = 'https://openrouter.ai/api/v1'
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const { apiKey } = options
    
    if (!apiKey) {
      throw new Error('API key is required for OpenRouter')
    }
    
    // Use the model ID as provided (model name resolution is handled at the API route level)
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
        const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://api.polydev.ai',
        'X-Title': 'Polydev AI'
      },
      body: JSON.stringify(requestBody)
    
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const response = await this.createMessage({ ...options })
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