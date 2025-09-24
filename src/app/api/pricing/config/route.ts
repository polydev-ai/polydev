import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS for public pricing data
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get pricing configuration (no auth required for public pricing)
    const { data: configs, error } = await supabase
      .from('admin_pricing_config')
      .select('config_key, config_value')

    if (error) {
      throw error
    }

    const configObj: any = {}
    configs?.forEach(item => {
      configObj[item.config_key] = item.config_value
    })

    return NextResponse.json({
      success: true,
      config: configObj
    })

  } catch (error) {
    console.error('[Pricing Config API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin access for updates
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { configKey, configValue } = await request.json()

    // Update configuration
    const { error } = await supabase
      .from('admin_pricing_config')
      .update({
        config_value: configValue,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', configKey)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully'
    })

  } catch (error) {
    console.error('[Pricing Config API] Error updating:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}