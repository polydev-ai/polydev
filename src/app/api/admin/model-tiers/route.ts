'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin API for managing model tiers and max tokens
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const url = new URL(request.url)
    const tier = url.searchParams.get('tier')
    const provider = url.searchParams.get('provider')

    let query = supabase
      .from('model_tiers')
      .select('*')
      .order('tier', { ascending: true })
      .order('provider', { ascending: true })
      .order('model_name', { ascending: true })

    if (tier) {
      query = query.eq('tier', tier)
    }

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data: models, error } = await query

    if (error) {
      console.error('Error fetching model tiers:', error)
      return NextResponse.json({ error: 'Failed to fetch model tiers' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      models: models || []
    })
  } catch (error) {
    console.error('Error in admin model-tiers API:', error)
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
      case 'update':
        return await updateModelTier(supabase, data)
      case 'create':
        return await createModelTier(supabase, data)
      case 'delete':
        return await deleteModelTier(supabase, data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in admin model-tiers POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateModelTier(supabase: any, data: any) {
  const { id, model_name, display_name, tier, max_output_tokens, active } = data

  if (!id) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 })
  }

  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (model_name !== undefined) updateData.model_name = model_name
  if (display_name !== undefined) updateData.display_name = display_name
  if (tier !== undefined) updateData.tier = tier
  if (max_output_tokens !== undefined) updateData.max_output_tokens = max_output_tokens
  if (active !== undefined) updateData.active = active

  const { data: updated, error } = await supabase
    .from('model_tiers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating model tier:', error)
    return NextResponse.json({ error: 'Failed to update model tier' }, { status: 500 })
  }

  return NextResponse.json({ success: true, model: updated })
}

async function createModelTier(supabase: any, data: any) {
  const { provider, model_name, display_name, tier, max_output_tokens } = data

  if (!provider || !model_name || !display_name || !tier) {
    return NextResponse.json({
      error: 'Provider, model_name, display_name, and tier are required'
    }, { status: 400 })
  }

  const insertData = {
    provider,
    model_name,
    display_name,
    tier,
    max_output_tokens: max_output_tokens || (tier === 'premium' ? 16000 : tier === 'normal' ? 8000 : 4000),
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: created, error } = await supabase
    .from('model_tiers')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating model tier:', error)
    return NextResponse.json({ error: 'Failed to create model tier' }, { status: 500 })
  }

  return NextResponse.json({ success: true, model: created })
}

async function deleteModelTier(supabase: any, data: any) {
  const { id } = data

  if (!id) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('model_tiers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting model tier:', error)
    return NextResponse.json({ error: 'Failed to delete model tier' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}