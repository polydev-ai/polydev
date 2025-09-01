import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { MCPMemoryManager } from '@/lib/mcpMemory'

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Memory endpoint called')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API] User authenticated:', user.id)
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || 'all'
    console.log('[API] Search query:', query)

    const memoryManager = new MCPMemoryManager()
    const context = await memoryManager.searchRelevantContext(user.id, query)
    
    console.log('[API] Context retrieved:', {
      conversations: context.conversations?.length || 0,
      projectMemories: context.projectMemories?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        conversations: context.conversations,
        projectMemories: context.projectMemories
      }
    })

  } catch (error: any) {
    console.error('[API] Error fetching memories:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch memories' 
    }, { status: 500 })
  }
}