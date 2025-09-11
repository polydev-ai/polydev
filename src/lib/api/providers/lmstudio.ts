import { ApiHandler } from '../index'
import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class LMStudioHandler implements ApiHandler {
  private transformer = new OpenAITransformer()
  private baseUrl = 'http://localhost:1234/v1'
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
        const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LM Studio API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const response = await this.createMessage({ ...options })
    return response.body || new ReadableStream()
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`)
      return response.ok
    } catch { return false }
  }
}