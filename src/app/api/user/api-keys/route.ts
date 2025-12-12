/**
 * API Keys Management
 * Users manage their personal API keys for AI providers
 */

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

    // Get user's API keys (exclude admin keys)
    const { data: apiKeys, error } = await supabase
      .from('user_api_keys')
      .select('provider, key_preview, monthly_budget, current_usage, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_admin_key', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API Keys] Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Get credit balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      apiKeys: apiKeys || [],
      creditBalance: credits?.balance || 0,
      message: (apiKeys && apiKeys.length > 0) ?
        'Your API keys are configured. You can use AI models!' :
        'Add your API keys to start using AI models.'
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

    const { action, provider, apiKey, monthlyBudget } = await request.json()

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
            current_usage: 0,
            is_admin_key: false
          })

        if (insertError) {
          console.error('[API Keys] Error inserting API key:', insertError)
          return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 })
        }

        return NextResponse.json({
          message: `${provider} API key added successfully! You can now use ${provider} models.`
        })

      case 'remove_api_key':
        if (!provider) {
          return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
        }

        const { error: deleteError } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', provider)
          .eq('is_admin_key', false)

        if (deleteError) {
          console.error('[API Keys] Error removing API key:', deleteError)
          return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 })
        }

        return NextResponse.json({
          message: `${provider} API key removed successfully.`
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
          .eq('is_admin_key', false)

        if (updateError) {
          console.error('[API Keys] Error updating budget:', updateError)
          return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
        }

        return NextResponse.json({
          message: `Budget updated to $${monthlyBudget} for ${provider}.`
        })

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

    // Delete the API key (only user's own keys, not admin keys)
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('is_admin_key', false)

    if (error) {
      console.error('[API Keys] Error deleting API key:', error)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({
      message: `${provider} API key deleted successfully.`
    })

  } catch (error) {
    console.error('[API Keys] Error in DELETE handler:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
