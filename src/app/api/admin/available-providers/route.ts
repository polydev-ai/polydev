'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'

// Helper function to check admin access
async function checkAdminAccess(adminClient: any, userId: string, userEmail: string): Promise<boolean> {
  const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com']);
  if (legacyAdminEmails.has(userEmail)) return true;

  try {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    return profile?.is_admin || false;
  } catch (error) {
    return false;
  }
}

// Get ALL active providers from providers_registry table
// This enables the admin providers page to add keys for any registered provider
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check admin access
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get all active providers from providers_registry (the canonical source)
    const { data: providers, error } = await adminClient
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
