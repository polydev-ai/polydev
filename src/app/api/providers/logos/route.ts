import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First get providers from database
    const { data: dbProviders, error: dbError } = await supabase
      .from('provider_configurations')
      .select('*')

    // Then fetch from models.dev API
    let modelsDevProviders = []
    try {
      const response = await fetch('https://api.models.dev/providers', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Polydev-Dashboard/1.0'
        }
      })

      if (response.ok) {
        modelsDevProviders = await response.json()
      }
    } catch (error) {
      console.log('[Provider Logos] Failed to fetch from models.dev:', error)
    }

    // Combine and create a comprehensive logo mapping
    const logoMapping: Record<string, string> = {}

    // First add database providers
    if (dbProviders) {
      dbProviders.forEach(provider => {
        const keys = [
          provider.id,
          provider.name,
          provider.display_name,
          provider.provider_name
        ].filter(Boolean)

        keys.forEach(key => {
          if (key && provider.logo_url) {
            logoMapping[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = provider.logo_url
          }
        })
      })
    }

    // Then add models.dev providers
    if (modelsDevProviders && Array.isArray(modelsDevProviders)) {
      modelsDevProviders.forEach((provider: any) => {
        const keys = [
          provider.id,
          provider.name,
          provider.display_name
        ].filter(Boolean)

        keys.forEach(key => {
          if (key && provider.logo_url) {
            logoMapping[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = provider.logo_url
          }
        })
      })
    }

    // Add fallback URLs for common providers - ENHANCED with all providers
    const fallbacks = {
      // OpenAI
      'openai': 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
      'gpt': 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',

      // Anthropic
      'anthropic': 'https://cdn.worldvectorlogo.com/logos/anthropic.svg',
      'claude': 'https://cdn.worldvectorlogo.com/logos/anthropic.svg',

      // Google
      'google': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'googlevertexai': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'googlegemini': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'gemini': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',

      // xAI
      'xai': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
      'x-ai': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
      'grok': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',

      // DeepSeek
      'deepseek': 'https://avatars.githubusercontent.com/u/159560534?s=200&v=4',

      // Cerebras
      'cerebras': 'https://avatars.githubusercontent.com/u/76206399?s=200&v=4',

      // Groq
      'groq': 'https://avatars.githubusercontent.com/u/129830771?s=200&v=4',

      // Moonshot AI (Kimi)
      'moonshot': 'https://assets.moonshot.cn/logo.png',
      'moonshotai': 'https://assets.moonshot.cn/logo.png',
      'kimi': 'https://assets.moonshot.cn/logo.png',

      // Alibaba (Qwen)
      'qwen': 'https://cdn.worldvectorlogo.com/logos/alibaba-group-holding-limited.svg',
      'alibaba': 'https://cdn.worldvectorlogo.com/logos/alibaba-group-holding-limited.svg',

      // Zhipu AI (GLM)
      'glm': 'https://avatars.githubusercontent.com/u/137628472?s=200&v=4',
      'zhipuai': 'https://avatars.githubusercontent.com/u/137628472?s=200&v=4',
      'zai': 'https://avatars.githubusercontent.com/u/137628472?s=200&v=4',
      'zaicodingplan': 'https://avatars.githubusercontent.com/u/137628472?s=200&v=4',

      // Other providers
      'mistral': 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4',
      'mistralai': 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4',
      'together': 'https://avatars.githubusercontent.com/u/59926009?s=200&v=4',
      'togetherai': 'https://avatars.githubusercontent.com/u/59926009?s=200&v=4',
      'perplexity': 'https://avatars.githubusercontent.com/u/83043819?s=200&v=4',
      'cohere': 'https://avatars.githubusercontent.com/u/30046380?s=200&v=4',
      'huggingface': 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
      'hugging-face': 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
      'openrouter': 'https://avatars.githubusercontent.com/u/94922015?s=200&v=4',
      'fireworksai': 'https://avatars.githubusercontent.com/u/109181394?s=200&v=4',
      'fireworks': 'https://avatars.githubusercontent.com/u/109181394?s=200&v=4',
      'replicate': 'https://avatars.githubusercontent.com/u/30462522?s=200&v=4'
    }

    // Add fallbacks only if not already present
    Object.entries(fallbacks).forEach(([key, url]) => {
      if (!logoMapping[key]) {
        logoMapping[key] = url
      }
    })

    return NextResponse.json({
      logoMapping,
      dbProviders: dbProviders?.length || 0,
      modelsDevProviders: modelsDevProviders?.length || 0
    })

  } catch (error) {
    console.error('[Provider Logos] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider logos' },
      { status: 500 }
    )
  }
}