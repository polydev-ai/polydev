'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: config, error } = await supabase
      .from('admin_pricing_config')
      .select('*')
      .eq('config_key', 'mcp_default_max_tokens')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching MCP settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: config?.config_value || { max_tokens: 10000 }
    })
  } catch (error) {
    console.error('Error in admin MCP settings API:', error)
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
    const { max_tokens } = body

    if (!max_tokens || max_tokens < 1000 || max_tokens > 200000) {
      return NextResponse.json({
        error: 'Max tokens must be between 1000 and 200000'
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('admin_pricing_config')
      .upsert({
        config_key: 'mcp_default_max_tokens',
        config_value: { max_tokens },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'config_key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating MCP settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: data.config_value })
  } catch (error) {
    console.error('Error in admin MCP settings POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
