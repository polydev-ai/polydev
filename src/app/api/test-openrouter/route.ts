import { NextRequest, NextResponse } from 'next/server'
import { EnhancedHandlerFactory } from '@/lib/api/providers/enhanced-handlers'

export async function GET(request: NextRequest) {
  try {
    // Test if OpenRouter is supported
    const supportedProviders = EnhancedHandlerFactory.getSupportedProviders()
    const isOpenRouterSupported = supportedProviders.includes('openrouter')
    
    // Try to create OpenRouter handler
    let handlerCreated = false
    let handlerError = null
    
    try {
      const handler = EnhancedHandlerFactory.createHandler('openrouter')
      handlerCreated = true
    } catch (error) {
      handlerError = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      success: true,
      openrouterSupported: isOpenRouterSupported,
      supportedProviders,
      handlerCreated,
      handlerError,
      timestamp: new Date().toISOString(),
      message: isOpenRouterSupported && handlerCreated 
        ? 'OpenRouter integration is working correctly!' 
        : 'OpenRouter integration has issues'
    })

  } catch (error) {
    console.error('OpenRouter test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testApiCall } = await request.json()
    
    if (!testApiCall) {
      return NextResponse.json({ error: 'testApiCall not requested' }, { status: 400 })
    }

    // Create OpenRouter handler
    const handler = EnhancedHandlerFactory.createHandler('openrouter')
    
    // Test with a simple model validation
    const testModel = 'openai/gpt-3.5-turbo'
    
    // For now, just test that handler creation works
    // In a real test, we'd make an actual API call with a test key
    
    return NextResponse.json({
      success: true,
      message: 'OpenRouter handler created successfully',
      testModel,
      handlerType: handler.constructor.name,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenRouter test API call error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test API call failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}