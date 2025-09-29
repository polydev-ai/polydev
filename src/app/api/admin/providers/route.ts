'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin API for managing all provider API keys
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')
    const userId = url.searchParams.get('userId')

    let query = supabase
      .from('user_api_keys')
      .select(`
        *,
        profiles!inner(email)
      `)
      .order('created_at', { ascending: false })

    if (provider) {
      query = query.eq('provider', provider)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: apiKeys, error } = await query

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    // Transform data to include email
    const transformedKeys = apiKeys?.map((key: any) => ({
      ...key,
      user_email: key.profiles.email
    })) || []

    // Get provider statistics
    const { data: providerStats, error: statsError } = await supabase
      .from('user_api_keys')
      .select('provider, current_usage, monthly_budget')

    const stats = providerStats?.reduce((acc: any, key) => {
      if (!acc[key.provider]) {
        acc[key.provider] = {
          count: 0,
          totalUsage: 0,
          totalBudget: 0,
          activeKeys: 0
        }
      }
      acc[key.provider].count++
      acc[key.provider].totalUsage += key.current_usage || 0
      acc[key.provider].totalBudget += key.monthly_budget || 0
      if (key.current_usage > 0) acc[key.provider].activeKeys++
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      apiKeys: transformedKeys,
      stats
    })
  } catch (error) {
    console.error('Error in admin providers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'add_key':
        return await addProviderKey(supabase, data)
      case 'update_budget':
        return await updateKeyBudget(supabase, data)
      case 'toggle_active':
        return await toggleKeyActive(supabase, data)
      case 'reset_usage':
        return await resetKeyUsage(supabase, data)
      case 'reorder_keys':
        return await reorderKeys(supabase, data)
      case 'delete_key':
        return await deleteKey(supabase, data)
      case 'get_next_available_key':
        return await getNextAvailableKey(supabase, data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in admin providers POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function addProviderKey(supabase: any, data: any) {
  const { provider, key_name, encrypted_key, monthly_budget, rate_limit_rpm, user_id, priority_order, daily_limit } = data

  if (!provider || !user_id) {
    return NextResponse.json({ error: 'Provider and user_id are required' }, { status: 400 })
  }

  // Validate provider
  const validProviders = ['anthropic', 'openai', 'xai', 'google', 'cerebras', 'zai']
  if (!validProviders.includes(provider.toLowerCase())) {
    return NextResponse.json({ error: 'Invalid provider. Must be one of: ' + validProviders.join(', ') }, { status: 400 })
  }

  // Get the next priority order if not specified
  let finalPriorityOrder = priority_order
  if (!finalPriorityOrder) {
    const { data: existingKeys } = await supabase
      .from('user_api_keys')
      .select('priority_order')
      .eq('provider', provider)
      .eq('user_id', user_id)
      .order('priority_order', { ascending: false })
      .limit(1)

    finalPriorityOrder = (existingKeys?.[0]?.priority_order || 0) + 1
  }

  // Create key preview
  let keyPreview = 'Admin Key'
  if (encrypted_key && encrypted_key.trim()) {
    const decodedKey = atob(encrypted_key)
    keyPreview = decodedKey.length > 8
      ? `${decodedKey.slice(0, 8)}...${decodedKey.slice(-4)}`
      : `${decodedKey.slice(0, 4)}***`
  }

  const keyData = {
    user_id,
    provider: provider.toLowerCase(),
    key_name: key_name || `${provider} Admin Key #${finalPriorityOrder}`,
    encrypted_key: encrypted_key || '',
    key_preview: keyPreview,
    monthly_budget: monthly_budget || null,
    daily_limit: daily_limit || null,
    rate_limit_rpm: rate_limit_rpm || null,
    priority_order: finalPriorityOrder,
    current_usage: 0,
    daily_usage: 0,
    active: true,
    last_used_at: null,
    created_at: new Date().toISOString()
  }

  const { data: newKey, error } = await supabase
    .from('user_api_keys')
    .insert(keyData)
    .select()
    .single()

  if (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }

  return NextResponse.json({ success: true, apiKey: newKey })
}

async function updateKeyBudget(supabase: any, data: any) {
  const { keyId, monthly_budget } = data

  const { error } = await supabase
    .from('user_api_keys')
    .update({
      monthly_budget,
      updated_at: new Date().toISOString()
    })
    .eq('id', keyId)

  if (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

async function toggleKeyActive(supabase: any, data: any) {
  const { keyId, active } = data

  const { error } = await supabase
    .from('user_api_keys')
    .update({
      active,
      updated_at: new Date().toISOString()
    })
    .eq('id', keyId)

  if (error) {
    console.error('Error toggling active status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

async function resetKeyUsage(supabase: any, data: any) {
  const { keyId } = data

  const { error } = await supabase
    .from('user_api_keys')
    .update({
      current_usage: 0,
      daily_usage: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', keyId)

  if (error) {
    console.error('Error resetting usage:', error)
    return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

async function reorderKeys(supabase: any, data: any) {
  const { provider, user_id, keyOrders } = data

  if (!provider || !user_id || !keyOrders || !Array.isArray(keyOrders)) {
    return NextResponse.json({ error: 'Provider, user_id, and keyOrders array are required' }, { status: 400 })
  }

  try {
    // Update each key's priority order
    for (const { keyId, priority_order } of keyOrders) {
      const { error } = await supabase
        .from('user_api_keys')
        .update({
          priority_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)
        .eq('provider', provider)
        .eq('user_id', user_id)

      if (error) {
        console.error('Error updating key order:', error)
        return NextResponse.json({ error: `Failed to update order for key ${keyId}` }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering keys:', error)
    return NextResponse.json({ error: 'Failed to reorder keys' }, { status: 500 })
  }
}

async function deleteKey(supabase: any, data: any) {
  const { keyId, user_id } = data

  if (!keyId || !user_id) {
    return NextResponse.json({ error: 'Key ID and user_id are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', user_id)

  if (error) {
    console.error('Error deleting key:', error)
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

async function getNextAvailableKey(supabase: any, data: any) {
  const { provider, user_id } = data

  if (!provider || !user_id) {
    return NextResponse.json({ error: 'Provider and user_id are required' }, { status: 400 })
  }

  try {
    // Get all active keys for this provider/user ordered by priority
    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('provider', provider)
      .eq('user_id', user_id)
      .eq('active', true)
      .order('priority_order', { ascending: true })

    if (error) {
      console.error('Error fetching keys:', error)
      return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }

    if (!keys || keys.length === 0) {
      return NextResponse.json({ error: 'No active keys found for this provider' }, { status: 404 })
    }

    // Find the first key that hasn't exceeded its limits
    const currentDate = new Date().toISOString().slice(0, 10)

    for (const key of keys) {
      let canUse = true
      let reason = ''

      // Check monthly budget
      if (key.monthly_budget && key.current_usage >= key.monthly_budget) {
        canUse = false
        reason = 'Monthly budget exceeded'
        continue
      }

      // Check daily limit
      if (key.daily_limit) {
        // Reset daily usage if it's a new day
        const lastUsedDate = key.last_used_at ? new Date(key.last_used_at).toISOString().slice(0, 10) : null

        if (lastUsedDate !== currentDate) {
          // Reset daily usage for new day
          await supabase
            .from('user_api_keys')
            .update({ daily_usage: 0 })
            .eq('id', key.id)

          key.daily_usage = 0
        }

        if (key.daily_usage >= key.daily_limit) {
          canUse = false
          reason = 'Daily limit exceeded'
          continue
        }
      }

      if (canUse) {
        return NextResponse.json({
          success: true,
          key: {
            id: key.id,
            provider: key.provider,
            key_name: key.key_name,
            encrypted_key: key.encrypted_key,
            priority_order: key.priority_order,
            monthly_budget: key.monthly_budget,
            daily_limit: key.daily_limit,
            current_usage: key.current_usage,
            daily_usage: key.daily_usage,
            rate_limit_rpm: key.rate_limit_rpm
          }
        })
      }
    }

    return NextResponse.json({ error: 'All keys have exceeded their limits' }, { status: 429 })

  } catch (error) {
    console.error('Error getting next available key:', error)
    return NextResponse.json({ error: 'Failed to get next available key' }, { status: 500 })
  }
}