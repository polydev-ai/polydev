/**
 * API Keys Management with OpenRouter Fallback Support
 * Users can now use the platform without providing API keys (using credits)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { OpenRouterManager } from '@/lib/openrouterManager'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's API keys
    const { data: apiKeys, error } = await supabase
      .from('user_api_keys')
      .select('provider, key_preview, monthly_budget, current_usage, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API Keys] Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Get user's OpenRouter key status
    const openRouterManager = new OpenRouterManager()
    let openRouterKeyStatus = null
    
    try {
      const { data: openRouterKey } = await supabase
        .from('openrouter_user_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (openRouterKey) {
        openRouterKeyStatus = {
          hasKey: true,
          spendingLimit: openRouterKey.spending_limit,
          createdAt: openRouterKey.created_at
        }
      }
    } catch (error) {
      // No OpenRouter key exists yet
      openRouterKeyStatus = { hasKey: false }
    }

    // Get credit balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      apiKeys: apiKeys || [],
      openRouterKey: openRouterKeyStatus,
      creditBalance: credits?.balance || 0,
      canUsePlatformWithoutKeys: credits?.balance > 0 || openRouterKeyStatus?.hasKey,
      message: credits?.balance > 0 ? 
        'You can use AI models with credits even without API keys!' :
        'Add API keys or purchase credits to start using AI models.'
    })

  } catch (error) {
    console.error('[API Keys] Error in GET handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, provider, apiKey, monthlyBudget, spendingLimit } = await request.json()

    switch (action) {
      case 'add_api_key':
        if (!provider || !apiKey) {
          return NextResponse.json({ error: 'Provider and API key are required' }, { status: 400 })
        }

        // Encode the API key
        const encodedKey = Buffer.from(apiKey).toString('base64')
        const keyPreview = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`

        // Insert the API key
        const { error: insertError } = await supabase
          .from('user_api_keys')
          .insert({
            user_id: user.id,
            provider,
            encrypted_key: encodedKey,
            key_preview: keyPreview,
            monthly_budget: monthlyBudget || null,
            current_usage: 0
          })

        if (insertError) {
          console.error('[API Keys] Error inserting API key:', insertError)
          return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 })
        }

        return NextResponse.json({ 
          message: `${provider} API key added successfully! You can now use ${provider} models.`,
          fallbackInfo: 'If this key fails or exceeds budget, the system will automatically use your credits as fallback.'
        })

      case 'create_openrouter_key':
        try {
          const openRouterManager = new OpenRouterManager()
          const initialLimit = spendingLimit || 10

          // Create or get OpenRouter key for user
          const keyHash = await openRouterManager.getOrCreateUserKey(user.id, initialLimit)

          return NextResponse.json({ 
            message: `OpenRouter API key created with $${initialLimit} spending limit!`,
            keyHash: keyHash.substring(0, 12) + '...',
            spendingLimit: initialLimit
          })

        } catch (error) {
          console.error('[API Keys] Error creating OpenRouter key:', error)
          return NextResponse.json({ 
            error: 'Failed to create OpenRouter key. Please try again.' 
          }, { status: 500 })
        }

      case 'remove_api_key':
        if (!provider) {
          return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
        }

        const { error: deleteError } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', provider)

        if (deleteError) {
          console.error('[API Keys] Error removing API key:', deleteError)
          return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 })
        }

        return NextResponse.json({ 
          message: `${provider} API key removed successfully.`,
          fallbackInfo: 'You can still use this provider through credits if available.'
        })

      case 'update_budget':
        if (!provider || monthlyBudget === undefined) {
          return NextResponse.json({ error: 'Provider and monthly budget are required' }, { status: 400 })
        }

        const { error: updateError } = await supabase
          .from('user_api_keys')
          .update({ monthly_budget: monthlyBudget })
          .eq('user_id', user.id)
          .eq('provider', provider)

        if (updateError) {
          console.error('[API Keys] Error updating budget:', updateError)
          return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
        }

        return NextResponse.json({ 
          message: `Budget updated to $${monthlyBudget} for ${provider}.`,
          fallbackInfo: 'When budget is exceeded, the system will use credits as fallback.'
        })

      case 'update_openrouter_limit':
        try {
          const openRouterManager = new OpenRouterManager()
          const newLimit = spendingLimit || 10

          await openRouterManager.updateUserKeyLimit(user.id, newLimit)

          return NextResponse.json({ 
            message: `OpenRouter spending limit updated to $${newLimit}!`
          })

        } catch (error) {
          console.error('[API Keys] Error updating OpenRouter limit:', error)
          return NextResponse.json({ 
            error: 'Failed to update OpenRouter spending limit.' 
          }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[API Keys] Error in POST handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'Provider parameter is required' }, { status: 400 })
    }

    // Delete the API key
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) {
      console.error('[API Keys] Error deleting API key:', error)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${provider} API key deleted successfully.`,
      fallbackInfo: 'You can still use AI models through credits or add a new API key anytime.'
    })

  } catch (error) {
    console.error('[API Keys] Error in DELETE handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}