import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { MCPMemoryManager } from '@/lib/mcpMemory'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || 'all'

    const memoryManager = new MCPMemoryManager()
    const context = await memoryManager.searchRelevantContext(user.id, query)

    return NextResponse.json({
      success: true,
      data: {
        conversations: context.conversations,
        projectMemories: context.projectMemories
      }
    })

  } catch (error: any) {
    console.error('Error fetching memories:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch memories' 
    }, { status: 500 })
  }
}