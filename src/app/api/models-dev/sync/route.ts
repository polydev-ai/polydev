import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { modelsDevService } from '@/lib/models-dev-integration'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication - only allow authenticated users to trigger sync
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Check if user is admin (you can implement this based on your user roles)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.email === 'admin@polydev.ai' || profile?.email === 'venkat@polydev.ai'
    
    // For now, allow any authenticated user to trigger sync
    // In production, you might want to restrict this to admins only
    
    console.log('Starting models.dev sync triggered by:', user.email)
    
    // Trigger the sync
    await modelsDevService.syncFromModelsDevAPI()
    
    // Get latest sync status
    const syncHistory = await modelsDevService.getSyncHistory()
    const latestSync = syncHistory[0]

    return NextResponse.json({
      success: true,
      message: 'models.dev sync completed successfully',
      sync: {
        providers_synced: latestSync?.providers_synced || 0,
        models_synced: latestSync?.models_synced || 0,
        duration_ms: latestSync?.sync_duration_ms || 0,
        status: latestSync?.status || 'completed'
      }
    })
  } catch (error) {
    console.error('Error in models.dev sync:', error)
    return NextResponse.json({
      error: 'Failed to sync models.dev data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get sync history (this can be public)
    const syncHistory = await modelsDevService.getSyncHistory()
    
    // Get summary statistics
    const providers = await modelsDevService.getProviders()
    const models = await modelsDevService.getModels()
    const reasoningModels = await modelsDevService.getReasoningModels()
    const visionModels = await modelsDevService.getVisionModels()

    return NextResponse.json({
      sync_history: syncHistory,
      statistics: {
        total_providers: providers.length,
        total_models: models.length,
        reasoning_models: reasoningModels.length,
        vision_models: visionModels.length,
        last_sync: syncHistory[0]?.created_at || null
      }
    })
  } catch (error) {
    console.error('Error getting models.dev sync status:', error)
    return NextResponse.json({
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}