'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Get distinct provider names from model_tiers table
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get distinct provider names from model_tiers
    const { data: providers, error } = await supabase
      .from('model_tiers')
      .select('provider')
      .order('provider')

    if (error) {
      console.error('Error fetching providers from model_tiers:', error)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    // Get unique provider names
    const uniqueProviders = [...new Set(providers?.map(p => p.provider) || [])]
      .filter(p => p) // Remove null/undefined
      .sort()

    return NextResponse.json({
      success: true,
      providers: uniqueProviders
    })
  } catch (error) {
    console.error('Error in available-providers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
