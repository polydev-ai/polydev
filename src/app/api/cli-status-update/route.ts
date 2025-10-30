import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

// Cache buster: Force TypeScript recompilation to bypass stale Vercel build cache
interface CLIStatusUpdate {
  provider: 'claude_code' | 'codex_cli' | 'gemini_cli'
  status: 'available' | 'unavailable' | 'not_installed' | 'checking'
  message?: string
  user_id?: string  // Now optional since we can auto-extract from token
  mcp_token: string
  cli_version?: string
  cli_path?: string
  authenticated?: boolean
  last_used?: string
  additional_info?: Record<string, any>
}

// Verify MCP token using service role to bypass RLS
async function verifyMCPToken(token: string, userId: string): Promise<boolean> {
  try {
    // Use service role client to bypass RLS policies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { createHash } = require('crypto')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    
    const { data: tokenData, error } = await supabase
      .from('mcp_user_tokens')
      .select('active, last_used_at')
      .eq('token_hash', tokenHash)
      .eq('user_id', userId)
      .eq('active', true)
      .single()

    if (error || !tokenData) {
      console.error('Token verification failed:', error)
      return false
    }

    // Update last used timestamp
    const { error: updateError } = await supabase
      .from('mcp_user_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Token update error:', updateError)
    }

    return true
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}

// Receive CLI status updates from MCP bridges
export async function POST(request: NextRequest) {
  try {
    const body: CLIStatusUpdate = await request.json()
    const { provider, status, message, user_id, mcp_token, cli_version, cli_path, authenticated, last_used, additional_info } = body

    // Validate required fields - user_id is now optional since we can extract it from token
    if (!provider || !status || !mcp_token) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        required: ['provider', 'status', 'mcp_token']
      }, { status: 400 })
    }

    // Extract user ID from token if not provided
    let actualUserId: string = user_id || ''; // Initialize with empty string for type safety
    if (!actualUserId) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { createHash } = require('crypto')
        const tokenHash = createHash('sha256').update(mcp_token).digest('hex')

        const { data: tokenData, error } = await supabase
          .from('mcp_user_tokens')
          .select('user_id')
          .eq('token_hash', tokenHash)
          .eq('active', true)
          .single()

        if (tokenData && !error) {
          actualUserId = tokenData.user_id;
          console.log(`[CLI Status] Auto-extracted user ID from token: ${actualUserId}`);
        } else {
          console.error('[CLI Status] Could not extract user ID from token:', error);
          return NextResponse.json({
            error: 'Invalid token or could not determine user ID'
          }, { status: 401 })
        }
      } catch (lookupError) {
        console.error('[CLI Status] Token lookup error:', lookupError);
        return NextResponse.json({
          error: 'Failed to validate token'
        }, { status: 500 })
      }
    }

    // Validate provider
    const validProviders = ['claude_code', 'codex_cli', 'gemini_cli']
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ 
        error: 'Invalid provider', 
        valid_providers: validProviders 
      }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['available', 'unavailable', 'not_installed', 'checking']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status', 
        valid_statuses: validStatuses 
      }, { status: 400 })
    }

    // Verify MCP token
    const isValidToken = await verifyMCPToken(mcp_token, actualUserId)
    if (!isValidToken) {
      console.log('[CLI-Status] Token verification failed for user:', actualUserId);
      return NextResponse.json({ error: 'Invalid or expired MCP token' }, { status: 401 })
    }
    console.log('[CLI-Status] Token verification successful for user:', actualUserId);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ✅ CRITICAL FIX: Check user subscription tier before attempting CLI configuration updates
    // Only Pro users can use CLI tools - skip database updates for free users
    const { data: userProfile } = await supabase
      .from('users')
      .select('tier')
      .eq('user_id', actualUserId)
      .single()

    const isProUser = userProfile?.tier === 'pro'

    if (!isProUser) {
      // Free user attempting to update CLI status - return early without error
      console.log(`[CLI-Status] Free user ${actualUserId} (tier: ${userProfile?.tier}) - CLI tools require Pro subscription, skipping database update`);
      return NextResponse.json({
        success: true,
        message: `CLI tools require Pro subscription. Status update skipped.`,
        subscription_required: 'pro',
        current_tier: userProfile?.tier || 'free'
      }, { status: 200 })  // Return 200 to avoid error logging in MCP bridge
    }

    // Update or create CLI configuration
    // Only update columns that exist in the actual database schema
    const updateData = {
      user_id: actualUserId,
      provider,
      status,
      enabled: authenticated ?? false,  // Map authenticated to enabled
      last_checked_at: new Date().toISOString(),
      // Store additional info in the custom_path field as JSON for now
      ...(cli_path && { custom_path: cli_path })
    }

    console.log('[DEBUG] Looking for existing configuration...');
    console.log('[DEBUG] User ID:', actualUserId);
    console.log('[DEBUG] Provider:', provider);

    // Try to update existing configuration
    const { data: existingConfig, error: selectError } = await supabase
      .from('cli_provider_configurations')
      .select('id')
      .eq('user_id', actualUserId)
      .eq('provider', provider)
      .single()

    console.log('[DEBUG] Select error:', selectError);
    console.log('[DEBUG] Existing config:', existingConfig);

    if (existingConfig) {
      console.log('[DEBUG] Updating existing configuration...');
      console.log('[DEBUG] Update data:', updateData);
      
      // Update existing configuration
      const { error: updateError } = await supabase
        .from('cli_provider_configurations')
        .update(updateData)
        .eq('id', existingConfig.id)

      if (updateError) {
        console.error('CLI config update error:', updateError)

        // Check if error is due to Pro subscription requirement
        if (updateError.message?.includes('CLI tools require Pro subscription')) {
          console.log('[CLI-Status] Free user attempted to enable CLI - blocked by database trigger (expected)');
          return NextResponse.json({
            error: 'CLI tools require Pro subscription',
            reason: 'Free tier users cannot enable CLI tools',
            subscription_required: 'pro'
          }, { status: 403 })
        }

        return NextResponse.json({ error: 'Failed to update CLI configuration' }, { status: 500 })
      }
      console.log('[DEBUG] Update successful!');
    } else {
      console.log('[DEBUG] Creating new configuration...');
      console.log('[DEBUG] Insert data:', {
        ...updateData,
        enabled: status === 'available',
        created_at: new Date().toISOString()
      });
      
      // Create new configuration
      const { error: insertError } = await supabase
        .from('cli_provider_configurations')
        .insert({
          ...updateData,
          enabled: status === 'available',
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('CLI config insert error:', insertError)

        // Check if error is due to Pro subscription requirement
        if (insertError.message?.includes('CLI tools require Pro subscription')) {
          console.log('[CLI-Status] Free user attempted to enable CLI - blocked by database trigger (expected)');
          return NextResponse.json({
            error: 'CLI tools require Pro subscription',
            reason: 'Free tier users cannot enable CLI tools',
            subscription_required: 'pro'
          }, { status: 403 })
        }

        return NextResponse.json({ error: 'Failed to create CLI configuration' }, { status: 500 })
      }
      console.log('[DEBUG] Insert successful!');
    }

    // Note: CLI status logging is disabled until cli_status_logs table is created
    // TODO: Create cli_status_logs table and enable logging

    return NextResponse.json({
      success: true,
      message: `CLI status updated for ${provider}`,
      status: status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('CLI status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get CLI status history for debugging
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('cli_status_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Status logs fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch status logs' }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      count: logs?.length || 0
    })

  } catch (error) {
    console.error('Status logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
