import { createClient } from '@/app/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

export interface MemoryConfig {
  maxConversationHistory?: number
  maxProjectMemories?: number
  enablePromptCache?: boolean
  minTokensForCache?: number
}

export interface ConversationMemory {
  id: string
  timestamp: string
  user_message: string
  assistant_response: string
  model_used: string
  tokens_used: number
  conversation_hash: string
  session_id?: string
}

export interface ProjectMemory {
  id: string
  user_id: string
  project_identifier: string // repo name, folder name, etc.
  memory_type: 'context' | 'pattern' | 'decision' | 'issue' | 'preference'
  title: string
  content: string
  relevance_score: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ContextSearchResult {
  conversations: ConversationMemory[]
  projectMemories: ProjectMemory[]
  relevantContext: string
  cacheKey?: string
}

/**
 * Remote MCP Memory Manager - stores everything in Supabase for cross-client access
 * Focuses on intelligent context retrieval and conversation continuity
 * Designed for MCP servers, not IDE integration
 */
export class MCPMemoryManager {
  private config: MemoryConfig
  private supabase: SupabaseClient | null
  
  constructor(config: MemoryConfig = {}, supabaseClient?: SupabaseClient) {
    this.config = {
      maxConversationHistory: 10,
      maxProjectMemories: 50,
      enablePromptCache: true,
      minTokensForCache: 1024,
      ...config
    }
    this.supabase = supabaseClient || null
    console.log(`[MCPMemory] Constructor - supabaseClient provided:`, !!supabaseClient)
    if (supabaseClient) {
      console.log(`[MCPMemory] Constructor - client type:`, typeof supabaseClient)
    }
  }

  /**
   * Get Supabase client - uses provided service client or falls back to regular client
   */
  private async getSupabaseClient(): Promise<SupabaseClient> {
    console.log(`[MCPMemory] getSupabaseClient - this.supabase exists:`, !!this.supabase)
    if (this.supabase) {
      console.log(`[MCPMemory] getSupabaseClient - using provided service client`)
      return this.supabase
    }
    console.log(`[MCPMemory] getSupabaseClient - falling back to regular createClient()`)
    return await createClient()
  }

  /**
   * Store a conversation in memory with intelligent tagging
   */
  async storeConversation(userId: string, conversation: {
    user_message: string
    assistant_response: string
    model_used: string
    tokens_used: number
    session_id?: string
    project_context?: string
  }): Promise<void> {
    console.log(`[MCPMemory] storeConversation called for userId: ${userId}`)
    try {
      console.log(`[MCPMemory] Getting Supabase client...`)
      const supabase = await this.getSupabaseClient()
      console.log(`[MCPMemory] Supabase client obtained`)
      
      // Create conversation hash for deduplication
      console.log(`[MCPMemory] Creating conversation hash...`)
      const conversationHash = this.generateConversationHash(
        conversation.user_message, 
        conversation.assistant_response
      )
      console.log(`[MCPMemory] Conversation hash: ${conversationHash}`)

      // Extract project identifier from context or message
      console.log(`[MCPMemory] Extracting project identifier...`)
      const projectIdentifier = this.extractProjectIdentifier(
        conversation.user_message, 
        conversation.project_context
      )
      console.log(`[MCPMemory] Project identifier: ${projectIdentifier}`)

      const recordToInsert = {
        user_id: userId,
        user_message: conversation.user_message,
        assistant_response: conversation.assistant_response,
        model_used: conversation.model_used,
        tokens_used: conversation.tokens_used,
        conversation_hash: conversationHash,
        session_id: conversation.session_id,
        project_identifier: projectIdentifier,
        created_at: new Date().toISOString()
      }
      
      console.log(`[MCPMemory] About to insert record:`, JSON.stringify(recordToInsert, null, 2))

      // Store conversation
      const { data, error } = await supabase
        .from('mcp_conversation_memory')
        .upsert(recordToInsert)
        
      if (error) {
        console.error(`[MCPMemory] Database insert error:`, error)
        throw error
      }
      
      console.log(`[MCPMemory] Insert successful, data:`, data)

      // Auto-extract and store project memories if patterns detected
      await this.extractProjectMemories(userId, conversation, projectIdentifier)

      // Clean up old conversations to stay within limits
      await this.cleanupOldConversations(userId)

    } catch (error) {
      console.error('Error storing conversation:', error)
    }
  }

  /**
   * Intelligently search for relevant context based on current query
   * This is the key intelligence - like Cline's ability to find right info
   */
  async searchRelevantContext(
    userId: string, 
    currentQuery: string,
    projectContext?: string
  ): Promise<ContextSearchResult> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Extract keywords and project hints from query
      const keywords = this.extractKeywords(currentQuery)
      const projectId = this.extractProjectIdentifier(currentQuery, projectContext)
      
      // Search recent conversations with semantic similarity
      const { data: conversations } = await supabase
        .from('mcp_conversation_memory')
        .select('*')
        .eq('user_id', userId)
        .or(`project_identifier.eq.${projectId || ''},project_identifier.is.null`)
        .order('created_at', { ascending: false })
        .limit(this.config.maxConversationHistory!)

      // Search project memories by relevance
      let projectMemoryQuery = supabase
        .from('mcp_project_memories')
        .select('*')
        .eq('user_id', userId)
        .gte('relevance_score', 0.3)
        .order('relevance_score', { ascending: false })

      // Filter by project if identified
      if (projectId) {
        projectMemoryQuery = projectMemoryQuery.eq('project_identifier', projectId)
      }

      // Filter by keywords in content or tags
      if (keywords.length > 0) {
        const keywordFilter = keywords
          .map(k => `content.ilike.%${k}%,tags.cs.{${k}}`)
          .join(',')
        projectMemoryQuery = projectMemoryQuery.or(keywordFilter)
      }

      const { data: projectMemories } = await projectMemoryQuery.limit(10)

      // Build contextual prompt
      const relevantContext = this.buildRelevantContext(
        conversations || [],
        projectMemories || [],
        currentQuery
      )

      return {
        conversations: conversations || [],
        projectMemories: projectMemories || [],
        relevantContext,
        cacheKey: this.generateCacheKey(relevantContext)
      }
      
    } catch (error) {
      console.error('Error searching relevant context:', error)
      return {
        conversations: [],
        projectMemories: [],
        relevantContext: '',
      }
    }
  }

  /**
   * Store a new project memory (used by auto-extraction)
   */
  async storeProjectMemory(userId: string, memory: {
    project_identifier: string
    memory_type: ProjectMemory['memory_type']
    title: string
    content: string
    tags?: string[]
  }): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()
      
      const relevanceScore = this.calculateRelevanceScore(memory.content)

      await supabase
        .from('mcp_project_memories')
        .insert({
          user_id: userId,
          project_identifier: memory.project_identifier,
          memory_type: memory.memory_type,
          title: memory.title,
          content: memory.content,
          relevance_score: relevanceScore,
          tags: memory.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Error storing project memory:', error)
    }
  }

  /**
   * Store/update dynamic project memory snapshots (not source of truth, just context copy)
   * Called on every request to keep memories fresh and relevant
   */
  async syncProjectMemory(userId: string, requestId: string, memory: {
    project_identifier: string
    memory_type: ProjectMemory['memory_type']
    title: string
    content: string
    tags?: string[]
  }): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Calculate relevance score based on content depth and recency
      const relevanceScore = this.calculateRelevanceScore(memory.content)

      // Use upsert with unique constraint on (user_id, project_identifier, memory_type, title)
      // This ensures we update existing memories rather than creating duplicates
      await supabase
        .from('mcp_project_memories')
        .upsert({
          user_id: userId,
          project_identifier: memory.project_identifier,
          memory_type: memory.memory_type,
          title: memory.title,
          content: memory.content,
          relevance_score: relevanceScore,
          tags: memory.tags || [],
          last_updated_by_request: requestId,
          sync_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,project_identifier,memory_type,title'
        })

    } catch (error) {
      console.error('Error syncing project memory:', error)
    }
  }

  /**
   * Bulk sync multiple project memories from current project state
   * Called during each MCP request to keep context fresh
   */
  async bulkSyncProjectState(userId: string, requestId: string, projectData: {
    project_identifier: string
    file_structure?: string[]
    dependencies?: Record<string, string>
    recent_changes?: string
    tech_stack?: string[]
    current_context?: string
  }): Promise<void> {
    const memories: any[] = []

    // Sync file structure snapshot
    if (projectData.file_structure && projectData.file_structure.length > 0) {
      memories.push({
        project_identifier: projectData.project_identifier,
        memory_type: 'file_structure',
        title: 'Current File Structure',
        content: projectData.file_structure.join('\n'),
        tags: ['structure', 'files']
      })
    }

    // Sync dependencies snapshot  
    if (projectData.dependencies && Object.keys(projectData.dependencies).length > 0) {
      memories.push({
        project_identifier: projectData.project_identifier,
        memory_type: 'dependencies',
        title: 'Current Dependencies',
        content: Object.entries(projectData.dependencies)
          .map(([name, version]) => `${name}: ${version}`)
          .join('\n'),
        tags: ['dependencies', 'packages']
      })
    }

    // Sync recent changes context
    if (projectData.recent_changes) {
      memories.push({
        project_identifier: projectData.project_identifier,
        memory_type: 'context',
        title: 'Recent Changes Context',
        content: projectData.recent_changes,
        tags: ['changes', 'recent']
      })
    }

    // Sync tech stack
    if (projectData.tech_stack && projectData.tech_stack.length > 0) {
      memories.push({
        project_identifier: projectData.project_identifier,
        memory_type: 'context',
        title: 'Technology Stack',
        content: projectData.tech_stack.join(', '),
        tags: ['tech', 'stack', 'technologies']
      })
    }

    // Sync all memories
    for (const memory of memories) {
      await this.syncProjectMemory(userId, requestId, memory)
    }
  }

  /**
   * Get user's memory preferences
   */
  async getMemoryPreferences(userId: string): Promise<{
    enable_conversation_memory: boolean
    enable_project_memory: boolean
    max_conversation_history: number
    auto_extract_patterns: boolean
  }> {
    try {
      const supabase = await this.getSupabaseClient()
      
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('mcp_settings')
        .eq('user_id', userId)
        .single()

      const memorySettings = preferences?.mcp_settings?.memory_settings || {}
      
      return {
        enable_conversation_memory: memorySettings.enable_conversation_memory ?? true,
        enable_project_memory: memorySettings.enable_project_memory ?? true,
        max_conversation_history: memorySettings.max_conversation_history ?? 10,
        auto_extract_patterns: memorySettings.auto_extract_patterns ?? true
      }
    } catch (error) {
      console.error('Error getting memory preferences:', error)
      return {
        enable_conversation_memory: true,
        enable_project_memory: true,
        max_conversation_history: 10,
        auto_extract_patterns: true
      }
    }
  }

  /**
   * Generate cacheable context string for prompt caching
   */
  generateCacheableContext(context: ContextSearchResult): {
    cacheablePrefix: string
    dynamicSuffix: string
  } {
    const staticContext = context.projectMemories
      .map(m => `[${m.memory_type}] ${m.title}: ${m.content}`)
      .join('\n\n')

    const dynamicHistory = context.conversations
      .slice(0, 3) // Most recent 3
      .map(c => `User: ${c.user_message}\nAssistant: ${c.assistant_response}`)
      .join('\n---\n')

    return {
      cacheablePrefix: `# Project Context\n\n${staticContext}`.trim(),
      dynamicSuffix: `\n\n# Recent Conversations\n\n${dynamicHistory}`.trim()
    }
  }

  // Private helper methods

  private generateConversationHash(userMessage: string, assistantResponse: string): string {
    const combined = userMessage + '|' + assistantResponse
    return Buffer.from(combined).toString('base64').substring(0, 32)
  }

  private extractProjectIdentifier(message: string, context?: string): string {
    // Look for common project indicators
    const patterns = [
      /(?:project|repo|repository)[:\s]+([a-zA-Z0-9\-_]+)/i,
      /(?:working on|building)[:\s]+([a-zA-Z0-9\-_]+)/i,
      /\/([a-zA-Z0-9\-_]+)(?:\/|$)/,
      /([a-zA-Z0-9\-_]+)\.(?:js|ts|py|md|json)/
    ]

    for (const pattern of patterns) {
      const match = (message + ' ' + (context || '')).match(pattern)
      if (match) return match[1].toLowerCase()
    }

    return 'default-project'
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => 
        word.length > 3 && 
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were'].includes(word)
      )
    
    // Return top 5 most relevant words
    return [...new Set(words)].slice(0, 5)
  }

  private buildRelevantContext(
    conversations: ConversationMemory[], 
    memories: ProjectMemory[],
    currentQuery: string
  ): string {
    let context = ''

    // Add relevant project memories first (cached content)
    if (memories.length > 0) {
      context += '# Relevant Project Knowledge\n\n'
      memories.forEach(memory => {
        context += `## ${memory.title} [${memory.memory_type}]\n${memory.content}\n\n`
      })
    }

    // Add recent conversation context (dynamic content)
    if (conversations.length > 0) {
      context += '# Recent Conversation History\n\n'
      conversations.slice(0, 5).forEach(conv => {
        context += `**${conv.timestamp}** (${conv.model_used}):\n`
        context += `User: ${conv.user_message.substring(0, 200)}...\n`
        context += `Assistant: ${conv.assistant_response.substring(0, 200)}...\n\n`
      })
    }

    return context.trim()
  }

  private async extractProjectMemories(
    userId: string, 
    conversation: any, 
    projectId: string
  ): Promise<void> {
    // Simple pattern detection for auto-extracting memories
    const message = conversation.user_message.toLowerCase()
    const response = conversation.assistant_response.toLowerCase()

    // Detect decision-making conversations
    if (message.includes('should we') || message.includes('which approach') || 
        response.includes('i recommend') || response.includes('best practice')) {
      
      await this.storeProjectMemory(userId, {
        project_identifier: projectId,
        memory_type: 'decision',
        title: `Decision: ${conversation.user_message.substring(0, 50)}...`,
        content: `Question: ${conversation.user_message}\n\nRecommendation: ${conversation.assistant_response}`,
        tags: this.extractKeywords(conversation.user_message)
      })
    }

    // Detect pattern/preference conversations
    if (message.includes('how to') || message.includes('pattern') || 
        response.includes('typically') || response.includes('convention')) {
      
      await this.storeProjectMemory(userId, {
        project_identifier: projectId,
        memory_type: 'pattern',
        title: `Pattern: ${conversation.user_message.substring(0, 50)}...`,
        content: conversation.assistant_response,
        tags: this.extractKeywords(conversation.user_message)
      })
    }
  }

  private calculateRelevanceScore(content: string): number {
    // Simple relevance scoring based on content characteristics
    let score = 0.5 // base score
    
    // Longer content gets higher score
    score += Math.min(content.length / 1000, 0.3)
    
    // Code examples get higher score
    if (content.includes('```') || content.includes('function') || content.includes('class')) {
      score += 0.2
    }
    
    // Decision/recommendation language gets higher score
    if (content.includes('recommend') || content.includes('should') || content.includes('best')) {
      score += 0.15
    }
    
    return Math.min(score, 1.0)
  }

  private generateCacheKey(content: string): string {
    return 'mcp_context_' + Buffer.from(content).toString('base64').substring(0, 16)
  }

  private async cleanupOldConversations(userId: string): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Keep only the most recent conversations within limit
      const { data: oldConversations } = await supabase
        .from('mcp_conversation_memory')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .range(this.config.maxConversationHistory!, 1000)

      if (oldConversations && oldConversations.length > 0) {
        const idsToDelete = oldConversations.map(c => c.id)
        await supabase
          .from('mcp_conversation_memory')
          .delete()
          .in('id', idsToDelete)
      }
    } catch (error) {
      console.error('Error cleaning up old conversations:', error)
    }
  }
}

export default MCPMemoryManager