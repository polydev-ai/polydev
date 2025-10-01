import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

interface DeductionRequest {
  session_id: string
  model_usage: Array<{
    model_id: string
    model_name: string
    tier: 'premium' | 'normal' | 'eco'
    provider: string
    source: 'cli' | 'api' | 'admin'
    input_tokens: number
    output_tokens: number
    estimated_cost: number
  }>
  perspectives_count?: number // Explicit count if different from model_usage.length
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DeductionRequest = await request.json()
    const { session_id, model_usage, perspectives_count } = body

    if (!session_id || !model_usage || model_usage.length === 0) {
      return NextResponse.json(
        { error: 'session_id and model_usage are required' },
        { status: 400 }
      )
    }

    // Group models by tier and source
    const deductions = {
      premium: 0,
      normal: 0,
      eco: 0
    }

    const usageRecords: any[] = []

    for (const usage of model_usage) {
      // Only count perspectives for admin source (CLI and API are FREE)
      if (usage.source === 'admin') {
        deductions[usage.tier]++
      }

      // Always log usage for tracking
      usageRecords.push({
        user_id: user.id,
        session_id,
        model_name: usage.model_name,
        model_tier: usage.tier,
        provider: usage.provider,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.input_tokens + usage.output_tokens,
        estimated_cost: usage.estimated_cost,
        perspectives_deducted: usage.source === 'admin' ? 1 : 0,
        request_metadata: {
          source: usage.source,
          model_id: usage.model_id
        }
      })
    }

    // Step 1: Start transaction - Get current quotas
    const { data: currentQuota, error: fetchError } = await supabase
      .from('user_perspective_quotas')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentQuota) {
      return NextResponse.json({ error: 'Failed to fetch quotas' }, { status: 500 })
    }

    // Step 2: Validate sufficient quota
    const newPremiumUsed = currentQuota.premium_perspectives_used + deductions.premium
    const newNormalUsed = currentQuota.normal_perspectives_used + deductions.normal
    const newEcoUsed = currentQuota.eco_perspectives_used + deductions.eco

    if (newPremiumUsed > currentQuota.premium_perspectives_limit) {
      return NextResponse.json({
        error: 'Insufficient Premium perspectives',
        details: {
          needed: deductions.premium,
          available: currentQuota.premium_perspectives_limit - currentQuota.premium_perspectives_used
        }
      }, { status: 400 })
    }

    if (newNormalUsed > currentQuota.normal_perspectives_limit) {
      return NextResponse.json({
        error: 'Insufficient Normal perspectives',
        details: {
          needed: deductions.normal,
          available: currentQuota.normal_perspectives_limit - currentQuota.normal_perspectives_used
        }
      }, { status: 400 })
    }

    if (newEcoUsed > currentQuota.eco_perspectives_limit) {
      return NextResponse.json({
        error: 'Insufficient Eco perspectives',
        details: {
          needed: deductions.eco,
          available: currentQuota.eco_perspectives_limit - currentQuota.eco_perspectives_used
        }
      }, { status: 400 })
    }

    // Step 3: Update quotas
    const { error: updateError } = await supabase
      .from('user_perspective_quotas')
      .update({
        premium_perspectives_used: newPremiumUsed,
        normal_perspectives_used: newNormalUsed,
        eco_perspectives_used: newEcoUsed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update quotas:', updateError)
      return NextResponse.json({ error: 'Failed to deduct perspectives' }, { status: 500 })
    }

    // Step 4: Log usage records
    const { error: logError } = await supabase
      .from('perspective_usage')
      .insert(usageRecords)

    if (logError) {
      console.error('Failed to log usage:', logError)
      // Don't fail the request if logging fails
    }

    // Step 5: Return updated quotas
    return NextResponse.json({
      success: true,
      deducted: {
        premium: deductions.premium,
        normal: deductions.normal,
        eco: deductions.eco
      },
      quotas_remaining: {
        premium: currentQuota.premium_perspectives_limit - newPremiumUsed,
        normal: currentQuota.normal_perspectives_limit - newNormalUsed,
        eco: currentQuota.eco_perspectives_limit - newEcoUsed
      },
      total_perspectives_deducted: deductions.premium + deductions.normal + deductions.eco,
      usage_logged: usageRecords.length
    })

  } catch (error) {
    console.error('Perspectives deduction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
