import { ApiHandler } from '../index'
import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class AzureHandler implements ApiHandler {
  private transformer = new OpenAITransformer()
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const { openAiApiKey: apiKey, openAiBaseUrl: azureEndpoint, azureApiVersion = '2023-12-01-preview' } = options
    
    if (!apiKey || !azureEndpoint) {
      throw new Error('API key and Azure endpoint are required for Azure OpenAI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
        const controller = this.createAbortController()
    const response = await fetch(`${azureEndpoint}/openai/deployments/${options.model}/chat/completions?api-version=${azureApiVersion}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const { openAiApiKey: apiKey, openAiBaseUrl: azureEndpoint, azureApiVersion = '2023-12-01-preview' } = options
    
    if (!apiKey || !azureEndpoint) {
      throw new Error('API key and Azure endpoint are required for Azure OpenAI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    
        const controller = this.createAbortController()
    const response = await fetch(`${azureEndpoint}/openai/deployments/${options.model}/chat/completions?api-version=${azureApiVersion}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI API error: ${error}`)
    }
    
    return response.body || new ReadableStream()
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    return true // Would need Azure endpoint to validate properly
  }
}