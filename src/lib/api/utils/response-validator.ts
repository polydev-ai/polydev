// Response Validator Implementation
// Validates and sanitizes API responses from different providers

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedResponse?: any
}

export interface ProviderResponseFormat {
  contentPath: string[]
  usagePath?: string[]
  errorPath?: string[]
  requiredFields: string[]
  optionalFields: string[]
}

export class ResponseValidator {
  private static readonly PROVIDER_FORMATS: Record<string, ProviderResponseFormat> = {
    anthropic: {
      contentPath: ['content', '0', 'text'],
      usagePath: ['usage'],
      errorPath: ['error'],
      requiredFields: ['content', 'model', 'usage'],
      optionalFields: ['id', 'type', 'role', 'stop_reason']
    },
    openai: {
      contentPath: ['choices', '0', 'message', 'content'],
      usagePath: ['usage'],
      errorPath: ['error'],
      requiredFields: ['choices', 'model', 'usage'],
      optionalFields: ['id', 'object', 'created', 'system_fingerprint']
    },
    google: {
      contentPath: ['candidates', '0', 'content', 'parts', '0', 'text'],
      usagePath: ['usageMetadata'],
      errorPath: ['error'],
      requiredFields: ['candidates'],
      optionalFields: ['usageMetadata', 'promptFeedback']
    }
  }
  
  validateResponse(response: any, providerId: string, expectedModel?: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic validation
    if (!response) {
      errors.push('Response is null or undefined')
      return { isValid: false, errors, warnings }
    }
    
    if (typeof response !== 'object') {
      errors.push('Response is not an object')
      return { isValid: false, errors, warnings }
    }
    
    // Check for error responses
    const errorResult = this.checkForErrors(response, providerId)
    if (errorResult.hasError) {
      errors.push(...errorResult.errors)
      return { isValid: false, errors, warnings }
    }
    
    // Provider-specific validation
    const providerFormat = ResponseValidator.PROVIDER_FORMATS[providerId]
    if (providerFormat) {
      const formatResult = this.validateFormat(response, providerFormat)
      errors.push(...formatResult.errors)
      warnings.push(...formatResult.warnings)
    }
    
    // Model validation - allow for versioned model names
    if (expectedModel && response.model && response.model !== expectedModel) {
      // Check if the response model is a versioned variant of the expected model
      const isVersionedVariant = 
        response.model.includes(expectedModel) || 
        expectedModel.includes(response.model) ||
        // Common versioning patterns
        response.model.replace(/-\d{4,}(-\d{2})?(-\d{2})?$/, '') === expectedModel ||
        expectedModel.replace(/-\d{4,}(-\d{2})?(-\d{2})?$/, '') === response.model
      
      if (!isVersionedVariant) {
        warnings.push(`Expected model '${expectedModel}' but got '${response.model}'`)
      }
    }
    
    // Content validation
    const contentResult = this.validateContent(response, providerId)
    errors.push(...contentResult.errors)
    warnings.push(...contentResult.warnings)
    
    // Usage validation
    const usageResult = this.validateUsage(response, providerId)
    warnings.push(...usageResult.warnings)
    
    // Sanitize response
    const sanitizedResponse = this.sanitizeResponse(response, providerId)
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedResponse
    }
  }
  
  private checkForErrors(response: any, providerId: string): { hasError: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Standard error field
    if (response.error) {
      const errorMsg = typeof response.error === 'string' 
        ? response.error 
        : response.error.message || response.error.type || 'Unknown error'
      errors.push(`API Error: ${errorMsg}`)
      return { hasError: true, errors }
    }
    
    // Provider-specific error patterns
    switch (providerId) {
      case 'anthropic':
        if (response.type === 'error') {
          errors.push(`Anthropic Error: ${response.message || 'Unknown error'}`)
          return { hasError: true, errors }
        }
        break
        
      case 'openai':
        if (response.choices && response.choices[0]?.finish_reason === 'content_filter') {
          errors.push('Content was filtered by OpenAI safety systems')
          return { hasError: true, errors }
        }
        break
        
      case 'google':
        if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
          errors.push('Content was blocked by Google safety filters')
          return { hasError: true, errors }
        }
        if (response.promptFeedback?.blockReason) {
          errors.push(`Google blocked prompt: ${response.promptFeedback.blockReason}`)
          return { hasError: true, errors }
        }
        break
    }
    
    return { hasError: false, errors }
  }
  
  private validateFormat(response: any, format: ProviderResponseFormat): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check required fields
    for (const field of format.requiredFields) {
      if (!(field in response)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
    
    // Check content path
    let current = response
    for (let i = 0; i < format.contentPath.length; i++) {
      const pathSegment = format.contentPath[i]
      if (current && typeof current === 'object') {
        if (Array.isArray(current) && !isNaN(Number(pathSegment))) {
          current = current[Number(pathSegment)]
        } else {
          current = current[pathSegment]
        }
      } else {
        warnings.push(`Cannot access content at path: ${format.contentPath.slice(0, i + 1).join('.')}`)
        break
      }
    }
    
    return { errors, warnings }
  }
  
  private validateContent(response: any, providerId: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    const content = this.extractContent(response, providerId)
    
    if (!content) {
      errors.push('No content found in response')
    } else {
      // Content quality checks
      if (typeof content === 'string') {
        if (content.trim().length === 0) {
          warnings.push('Content is empty or whitespace only')
        }
        if (content.length > 100000) {
          warnings.push('Content is unusually long (>100k characters)')
        }
        
        // Check for truncation indicators
        const truncationPatterns = [
          /\[truncated\]/i,
          /\.\.\.$/, 
          /\[continued\]/i,
          /\[output truncated\]/i
        ]
        
        if (truncationPatterns.some(pattern => pattern.test(content))) {
          warnings.push('Content appears to be truncated')
        }
      }
    }
    
    return { errors, warnings }
  }
  
  private validateUsage(response: any, providerId: string): { warnings: string[] } {
    const warnings: string[] = []
    
    const usage = this.extractUsage(response, providerId)
    
    if (!usage) {
      warnings.push('No usage information found')
      return { warnings }
    }
    
    // Validate usage numbers
    const tokenFields = ['prompt_tokens', 'completion_tokens', 'total_tokens',
                        'input_tokens', 'output_tokens', // Anthropic format
                        'promptTokenCount', 'candidatesTokenCount', 'totalTokenCount'] // Google format
    
    for (const field of tokenFields) {
      if (field in usage) {
        const value = usage[field]
        if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
          warnings.push(`Invalid ${field}: ${value}`)
        }
        if (value > 1000000) { // Suspiciously high token count
          warnings.push(`Unusually high ${field}: ${value}`)
        }
      }
    }
    
    return { warnings }
  }
  
  private extractContent(response: any, providerId: string): string | null {
    switch (providerId) {
      case 'anthropic':
        return response.content?.[0]?.text || null
        
      case 'openai':
      case 'groq':
      case 'deepseek':
      case 'mistral':
        return response.choices?.[0]?.message?.content || null
        
      case 'google':
      case 'vertex':
        return response.candidates?.[0]?.content?.parts?.[0]?.text || null
        
      default:
        // Try common patterns
        return response.content || 
               response.choices?.[0]?.message?.content ||
               response.text ||
               null
    }
  }
  
  private extractUsage(response: any, providerId: string): any {
    switch (providerId) {
      case 'anthropic':
        return response.usage || null
        
      case 'openai':
      case 'groq':
      case 'deepseek':
      case 'mistral':
        return response.usage || null
        
      case 'google':
      case 'vertex':
        return response.usageMetadata || null
        
      default:
        return response.usage || response.usageMetadata || null
    }
  }
  
  private sanitizeResponse(response: any, providerId: string): any {
    // Create a clean copy
    const sanitized = JSON.parse(JSON.stringify(response))
    
    // Remove sensitive information
    const sensitiveFields = ['api_key', 'token', 'authorization', 'secret']
    
    const removeSensitiveFields = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return
      
      Object.keys(obj).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          delete obj[key]
        } else if (typeof obj[key] === 'object') {
          removeSensitiveFields(obj[key])
        }
      })
    }
    
    removeSensitiveFields(sanitized)
    
    return sanitized
  }
  
  // Static helper methods
  static isStreamingResponse(response: any): boolean {
    return response && (
      response.object === 'chat.completion.chunk' ||
      response.type === 'content_block_delta' ||
      response.candidates?.[0]?.content?.parts?.[0]?.text !== undefined
    )
  }
  
  static extractErrorMessage(response: any): string {
    if (response.error) {
      if (typeof response.error === 'string') return response.error
      return response.error.message || response.error.type || 'Unknown error'
    }
    
    if (response.message) return response.message
    if (response.detail) return response.detail
    
    return 'Unknown error occurred'
  }
  
  static normalizeResponse(response: any, targetFormat: 'openai' | 'anthropic' | 'google' = 'openai'): any {
    // Convert response to target format for consistency
    // This helps with unified handling across different providers
    
    switch (targetFormat) {
      case 'openai':
        return {
          id: response.id || 'unknown',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: response.model || 'unknown',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: ResponseValidator.prototype.extractContent(response, 'anthropic') || 
                      ResponseValidator.prototype.extractContent(response, 'google') ||
                      ResponseValidator.prototype.extractContent(response, 'openai') || ''
            },
            finish_reason: 'stop'
          }],
          usage: ResponseValidator.prototype.extractUsage(response, 'openai') || 
                ResponseValidator.prototype.extractUsage(response, 'anthropic') ||
                ResponseValidator.prototype.extractUsage(response, 'google') || {
                  prompt_tokens: 0,
                  completion_tokens: 0, 
                  total_tokens: 0
                }
        }
        
      default:
        return response
    }
  }
}
