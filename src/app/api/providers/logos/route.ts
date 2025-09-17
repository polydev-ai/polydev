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

    // Add fallback URLs for common providers
    const fallbacks = {
      'openai': 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
      'gpt': 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
      'anthropic': 'https://cdn.worldvectorlogo.com/logos/anthropic.svg',
      'claude': 'https://cdn.worldvectorlogo.com/logos/anthropic.svg',
      'google': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'googlevertexai': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'googlegemini': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'gemini': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
      'mistral': 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4',
      'mistralai': 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4',
      'together': 'https://avatars.githubusercontent.com/u/59926009?s=200&v=4',
      'togetherai': 'https://avatars.githubusercontent.com/u/59926009?s=200&v=4',
      'cerebras': 'https://avatars.githubusercontent.com/u/76206399?s=200&v=4',
      'xai': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
      'x-ai': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
      'perplexity': 'https://avatars.githubusercontent.com/u/83043819?s=200&v=4',
      'cohere': 'https://avatars.githubusercontent.com/u/30046380?s=200&v=4',
      'huggingface': 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
      'hugging-face': 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
      'deepseek': 'https://avatars.githubusercontent.com/u/159560534?s=200&v=4'
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