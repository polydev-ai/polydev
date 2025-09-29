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
      
      // Check for API key exhaustion patterns
      const exhaustionResult = this.checkForApiKeyExhaustion(errorMsg, providerId)
      if (exhaustionResult.isExhausted) {
        errors.push(`API Key Exhausted: ${exhaustionResult.message}`)
        return { hasError: true, errors }
      }
      
      errors.push(`API Error: ${errorMsg}`)
      return { hasError: true, errors }
    }
    
    // Provider-specific error patterns
    switch (providerId) {
      case 'anthropic':
        if (response.type === 'error') {
          const errorMessage = response.message || 'Unknown error'
          const exhaustionResult = this.checkForApiKeyExhaustion(errorMessage, providerId)
          if (exhaustionResult.isExhausted) {
            errors.push(`Anthropic API Key Exhausted: ${exhaustionResult.message}`)
          } else {
            errors.push(`Anthropic Error: ${errorMessage}`)
          }
          return { hasError: true, errors }
        }
        break
        
      case 'openai':
      case 'openai-native':
        if (response.choices && response.choices[0]?.finish_reason === 'content_filter') {
          errors.push('Content was filtered by OpenAI safety systems')
          return { hasError: true, errors }
        }
        // Check for OpenAI organization verification errors
        if (response.error?.code === 'invalid_organization' || response.error?.type === 'invalid_organization') {
          errors.push('OpenAI Organization Verification Failed: Invalid organization or insufficient permissions')
          return { hasError: true, errors }
        }
        break
        
      case 'xai':
        // XAI-specific error patterns
        if (response.error) {
          const errorMsg = response.error.message || response.error.type || 'Unknown XAI error'
          const exhaustionResult = this.checkForApiKeyExhaustion(errorMsg, providerId)
          if (exhaustionResult.isExhausted) {
            errors.push(`XAI API Key Exhausted: ${exhaustionResult.message}`)
            return { hasError: true, errors }
          }
        }
        break
        
      case 'google':
        if (response.candidates) {
          // Handle both array and non-array candidates
          let candidate = null
          if (Array.isArray(response.candidates)) {
            candidate = response.candidates[0]
          } else {
            candidate = response.candidates
          }
          
          if (candidate?.finishReason === 'SAFETY') {
            errors.push('Content was blocked by Google safety filters')
            return { hasError: true, errors }
          }
        }
        if (response.promptFeedback?.blockReason) {
          errors.push(`Google blocked prompt: ${response.promptFeedback.blockReason}`)
          return { hasError: true, errors }
        }
        break
    }
    
    return { hasError: false, errors }
  }
  
  private checkForApiKeyExhaustion(errorMessage: string, providerId: string): { 
    isExhausted: boolean; 
    message: string;
    isPermanent: boolean;
  } {
    const msg = errorMessage.toLowerCase()
    
    // Common API key exhaustion patterns
    const exhaustionPatterns = [
      { pattern: /quota.*exceeded/i, message: 'API quota exceeded', permanent: false },
      { pattern: /rate.*limit.*exceeded/i, message: 'Rate limit exceeded', permanent: false },
      { pattern: /insufficient.*credits?/i, message: 'Insufficient credits', permanent: true },
      { pattern: /credit.*limit.*exceeded/i, message: 'Credit limit exceeded', permanent: true },
      { pattern: /api.*key.*invalid/i, message: 'Invalid API key', permanent: true },
      { pattern: /api.*key.*expired/i, message: 'API key expired', permanent: true },
      { pattern: /unauthorized/i, message: 'Unauthorized API key', permanent: true },
      { pattern: /forbidden/i, message: 'Access forbidden', permanent: true },
    ]
    
    // Provider-specific patterns
    const providerPatterns: Record<string, Array<{ pattern: RegExp; message: string; permanent: boolean }>> = {
      'openai': [
        { pattern: /organization.*not.*found/i, message: 'OpenAI organization not found or invalid', permanent: true },
        { pattern: /organization.*inactive/i, message: 'OpenAI organization inactive', permanent: true },
        { pattern: /billing.*issue/i, message: 'OpenAI billing issue detected', permanent: true },
        { pattern: /insufficient.*quota/i, message: 'OpenAI API quota insufficient', permanent: false },
      ],
      'openai-native': [
        { pattern: /organization.*not.*found/i, message: 'OpenAI organization not found or invalid', permanent: true },
        { pattern: /organization.*inactive/i, message: 'OpenAI organization inactive', permanent: true },
        { pattern: /billing.*issue/i, message: 'OpenAI billing issue detected', permanent: true },
        { pattern: /insufficient.*quota/i, message: 'OpenAI API quota insufficient', permanent: false },
      ],
      'xai': [
        { pattern: /grok.*unavailable/i, message: 'XAI Grok service unavailable', permanent: false },
        { pattern: /x\.ai.*quota.*exceeded/i, message: 'XAI quota exceeded', permanent: false },
        { pattern: /xai.*limit.*reached/i, message: 'XAI usage limit reached', permanent: false },
        { pattern: /invalid.*x-ai.*key/i, message: 'Invalid XAI API key', permanent: true },
      ],
      'anthropic': [
        { pattern: /claude.*unavailable/i, message: 'Claude service unavailable', permanent: false },
        { pattern: /anthropic.*quota/i, message: 'Anthropic quota exceeded', permanent: false },
        { pattern: /credit.*balance.*insufficient/i, message: 'Anthropic credit balance insufficient', permanent: true },
      ]
    }
    
    // Check common patterns first
    for (const { pattern, message, permanent } of exhaustionPatterns) {
      if (pattern.test(errorMessage)) {
        return {
          isExhausted: true,
          message,
          isPermanent: permanent
        }
      }
    }
    
    // Check provider-specific patterns
    const specificPatterns = providerPatterns[providerId] || []
    for (const { pattern, message, permanent } of specificPatterns) {
      if (pattern.test(errorMessage)) {
        return {
          isExhausted: true,
          message,
          isPermanent: permanent
        }
      }
    }
    
    return {
      isExhausted: false,
      message: errorMessage,
      isPermanent: false
    }
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
      case 'gemini':
        if (response.candidates) {
          // Handle both array and non-array candidates
          let candidate = null
          if (Array.isArray(response.candidates)) {
            candidate = response.candidates[0]
          } else {
            candidate = response.candidates
          }

          if (candidate?.content?.parts) {
            const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [candidate.content.parts]
            return parts[0]?.text || null
          }
        }
        return null
        
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
      case 'gemini':
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
  static checkApiKeyExhaustion(errorMessage: string, providerId: string): { 
    isExhausted: boolean; 
    message: string;
    isPermanent: boolean;
  } {
    const validator = new ResponseValidator()
    return validator.checkForApiKeyExhaustion(errorMessage, providerId)
  }
  
  static checkOrganizationError(response: any, providerId: string): {
    hasError: boolean;
    message: string;
  } {
    // Only check for OpenAI providers
    if (providerId !== 'openai' && providerId !== 'openai-native') {
      return { hasError: false, message: '' }
    }
    
    if (response?.error?.code === 'invalid_organization' || response?.error?.type === 'invalid_organization') {
      return {
        hasError: true,
        message: 'OpenAI Organization Verification Failed: Invalid organization or insufficient permissions'
      }
    }
    
    return { hasError: false, message: '' }
  }
  
  static isStreamingResponse(response: any): boolean {
    // Check for Google/Gemini candidates structure with array/object flexibility
    let hasGoogleContent = false
    if (response.candidates) {
      let candidate = null
      if (Array.isArray(response.candidates)) {
        candidate = response.candidates[0]
      } else {
        candidate = response.candidates
      }
      
      if (candidate?.content?.parts) {
        const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [candidate.content.parts]
        hasGoogleContent = parts[0]?.text !== undefined
      }
    }
    
    return response && (
      response.object === 'chat.completion.chunk' ||
      response.type === 'content_block_delta' ||
      hasGoogleContent
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
