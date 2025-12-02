'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Get ALL active providers from providers_registry table
// This enables the admin providers page to add keys for any registered provider
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all active providers from providers_registry (the canonical source)
    const { data: providers, error } = await supabase
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      console.error('Error fetching providers from providers_registry:', error)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    // Return full provider objects with canonical names
    // This ensures consistent naming when saving admin API keys
    return NextResponse.json({
      success: true,
      providers: providers || []
    })
  } catch (error) {
    console.error('Error in available-providers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
