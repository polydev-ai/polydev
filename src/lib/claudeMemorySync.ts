import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'

export interface ClaudeConversationEntry {
  type: 'user' | 'assistant'
  timestamp: string
  content: string
  model?: string
  cwd?: string
  gitBranch?: string
}

export interface ClaudeMemoryExtract {
  conversations: ClaudeConversationEntry[]
  patterns: Array<{
    type: string
    description: string
    timestamp: string
  }>
  contexts: Array<{
    type: string
    description: string  
    timestamp: string
  }>
  extractedAt: string
  sourceFile: string
}

export class ClaudeMemorySync {
  private claudeProjectsDir: string

  constructor() {
    // Standard Claude projects directory 
    const homeDir = os.homedir()
    this.claudeProjectsDir = path.join(homeDir, '.claude', 'projects')
  }

  /**
   * Get the most recent Claude conversation file
   */
  private getMostRecentConversationFile(): string | null {
    try {
      // Look for project-specific directory first
      const projectDirs = fs.readdirSync(this.claudeProjectsDir)
        .filter(dir => fs.statSync(path.join(this.claudeProjectsDir, dir)).isDirectory())
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.claudeProjectsDir, a))
          const statB = fs.statSync(path.join(this.claudeProjectsDir, b))
          return statB.mtime.getTime() - statA.mtime.getTime()
        })

      if (projectDirs.length === 0) return null

      // Get the most recent project directory
      const recentProjectDir = path.join(this.claudeProjectsDir, projectDirs[0])
      
      // Find the most recent .jsonl file in this directory
      const conversationFiles = fs.readdirSync(recentProjectDir)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => ({
          name: file,
          path: path.join(recentProjectDir, file),
          mtime: fs.statSync(path.join(recentProjectDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      return conversationFiles.length > 0 ? conversationFiles[0].path : null

    } catch (error) {
      console.warn('[Claude Memory] Could not access Claude conversation files:', error)
      return null
    }
  }

  /**
   * Extract recent conversations from Claude's .jsonl files
   */
  async extractRecentConversations(limit: number = 10): Promise<ClaudeMemoryExtract | null> {
    const filePath = this.getMostRecentConversationFile()
    if (!filePath) {
      console.log('[Claude Memory] No recent conversation files found')
      return null
    }

    try {
      const conversations: ClaudeConversationEntry[] = []
      const fileStream = fs.createReadStream(filePath)
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      })

      for await (const line of rl) {
        try {
          const entry = JSON.parse(line)
          
          // Extract user messages
          if (entry.type === 'user' && entry.message?.content) {
            const textContent = entry.message.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ')
            
            if (textContent && textContent.length > 10) {
              conversations.push({
                type: 'user',
                timestamp: entry.timestamp,
                content: textContent,
                cwd: entry.cwd,
                gitBranch: entry.gitBranch
              })
            }
          }
          
          // Extract assistant messages
          if (entry.type === 'assistant' && entry.message?.content) {
            const textContent = entry.message.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ')
            
            if (textContent && textContent.length > 10) {
              conversations.push({
                type: 'assistant',
                timestamp: entry.timestamp,
                content: textContent,
                model: entry.message.model
              })
            }
          }
        } catch (e) {
          // Skip invalid JSON lines
          continue
        }
      }

      // Get the last N conversation entries (most recent)
      const recentConversations = conversations.slice(-limit * 2)

      // Analyze for patterns and contexts
      const patterns = this.analyzePatterns(recentConversations)
      const contexts = this.analyzeContexts(recentConversations)

      return {
        conversations: recentConversations,
        patterns,
        contexts,
        extractedAt: new Date().toISOString(),
        sourceFile: path.basename(filePath)
      }

    } catch (error) {
      console.error('[Claude Memory] Error extracting conversations:', error)
      return null
    }
  }

  /**
   * Analyze conversations for debugging patterns
   */
  private analyzePatterns(conversations: ClaudeConversationEntry[]) {
    const patterns: any[] = []
    
    conversations.forEach(conv => {
      const content = conv.content.toLowerCase()
      
      if (content.includes('debug') || content.includes('error') || content.includes('fix')) {
        patterns.push({
          type: 'debugging',
          description: conv.content.substring(0, 200),
          timestamp: conv.timestamp
        })
      }
      
      if (content.includes('decided') || content.includes('chose') || content.includes('implement')) {
        patterns.push({
          type: 'decision',
          description: conv.content.substring(0, 200),
          timestamp: conv.timestamp
        })
      }
    })
    
    return patterns.slice(-5) // Keep last 5 patterns
  }

  /**
   * Analyze conversations for project contexts
   */
  private analyzeContexts(conversations: ClaudeConversationEntry[]) {
    const contexts: any[] = []
    
    conversations.forEach(conv => {
      const content = conv.content.toLowerCase()
      
      if (content.includes('working on') || content.includes('project') || 
          content.includes('implement') || content.includes('file') ||
          content.includes('component') || content.includes('function')) {
        contexts.push({
          type: 'context',
          description: conv.content.substring(0, 200),
          timestamp: conv.timestamp
        })
      }
    })
    
    return contexts.slice(-10) // Keep last 10 contexts
  }

  /**
   * Generate context summary for including in prompts
   */
  generateContextSummary(extract: ClaudeMemoryExtract): string {
    if (!extract || extract.conversations.length === 0) return ''

    let summary = '## Recent Claude Code Session Context\n\n'

    // Add recent conversation context
    if (extract.conversations.length > 0) {
      summary += '### Recent Conversation:\n'
      const recentPairs = []
      
      for (let i = 0; i < extract.conversations.length - 1; i += 2) {
        const user = extract.conversations[i]
        const assistant = extract.conversations[i + 1]
        
        if (user?.type === 'user' && assistant?.type === 'assistant') {
          recentPairs.push({
            user: user.content.substring(0, 150),
            assistant: assistant.content.substring(0, 150)
          })
        }
      }

      recentPairs.slice(-2).forEach((pair, idx) => {
        summary += `**Exchange ${idx + 1}:**\n`
        summary += `User: ${pair.user}...\n`
        summary += `Assistant: ${pair.assistant}...\n\n`
      })
    }

    // Add patterns if available
    if (extract.patterns.length > 0) {
      summary += '### Recent Patterns:\n'
      extract.patterns.slice(-3).forEach(pattern => {
        summary += `- ${pattern.type}: ${pattern.description.substring(0, 100)}...\n`
      })
      summary += '\n'
    }

    // Add working context
    if (extract.contexts.length > 0) {
      summary += '### Current Working Context:\n'
      extract.contexts.slice(-3).forEach(context => {
        summary += `- ${context.description.substring(0, 100)}...\n`
      })
      summary += '\n'
    }

    summary += `*Context extracted from: ${extract.sourceFile} at ${extract.extractedAt}*\n\n`

    return summary
  }
}