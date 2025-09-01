import { createClient } from '@/app/utils/supabase/server'

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
}

export interface ProjectMemory {
  id: string
  user_id: string
  project_identifier: string // repo name, folder name, etc.
  memory_type: 'context' | 'pattern' | 'decision' | 'issue'
  title: string
  content: string
  relevance_score: number
  tags: string[]
  created_at: string
  updated_at: string
}

/**
 * Remote MCP Memory Manager - stores everything in Supabase for cross-client access
 * Focuses on intelligent context retrieval and conversation continuity
 */
export class MCPMemoryManager {
  private config: MemoryConfig
  
  constructor(config: MemoryConfig = {}) {
    this.config = {
      maxConversationHistory: 10,
      maxProjectMemories: 100,
      enablePromptCache: true,
      minTokensForCache: 1024,
      ...config
    }
  }

  async initializeMemoryBank(): Promise<void> {
    try {
      await fs.mkdir(this.memoryBankPath, { recursive: true })
      
      // Create default memory bank files if they don't exist
      const defaultFiles = {
        'projectbrief.md': this.getDefaultProjectBrief(),
        'productContext.md': this.getDefaultProductContext(),
        'activeContext.md': this.getDefaultActiveContext(),
        'systemPatterns.md': this.getDefaultSystemPatterns(),
        'techContext.md': this.getDefaultTechContext(),
        'progress.md': this.getDefaultProgress()
      }

      for (const [filename, content] of Object.entries(defaultFiles)) {
        const filePath = path.join(this.memoryBankPath, filename)
        try {
          await fs.access(filePath)
        } catch {
          // File doesn't exist, create it
          await fs.writeFile(filePath, content, 'utf-8')
        }
      }
    } catch (error) {
      console.error('Error initializing memory bank:', error)
      throw error
    }
  }

  async readMemoryBank(): Promise<ProjectMemory> {
    await this.initializeMemoryBank()
    
    try {
      const files = ['projectbrief.md', 'productContext.md', 'activeContext.md', 
                    'systemPatterns.md', 'techContext.md', 'progress.md']
      
      const memory: Partial<ProjectMemory> = {}
      
      for (const filename of files) {
        const filePath = path.join(this.memoryBankPath, filename)
        const key = filename.replace('.md', '') as keyof ProjectMemory
        try {
          memory[key] = await fs.readFile(filePath, 'utf-8')
        } catch (error) {
          console.warn(`Could not read ${filename}:`, error)
          memory[key] = ''
        }
      }
      
      return memory as ProjectMemory
    } catch (error) {
      console.error('Error reading memory bank:', error)
      throw error
    }
  }

  async updateActiveContext(newContext: string): Promise<void> {
    const filePath = path.join(this.memoryBankPath, 'activeContext.md')
    const timestamp = new Date().toISOString()
    
    const updatedContent = `# Active Context
Last Updated: ${timestamp}

## Current Focus
${newContext}

## Recent Changes
- ${timestamp}: Context updated via API call

${await this.readFileWithFallback(filePath, '')}
`.trim()

    await fs.writeFile(filePath, updatedContent, 'utf-8')
  }

  async addConversationToHistory(userId: string, conversation: ConversationEntry): Promise<void> {
    try {
      const supabase = await createClient()
      
      // Store in database for persistence
      await supabase
        .from('conversation_history')
        .insert({
          user_id: userId,
          conversation_id: conversation.id,
          user_message: conversation.user_message,
          assistant_response: conversation.assistant_response,
          model_used: conversation.model_used,
          tokens_used: conversation.tokens_used,
          project_context: conversation.project_context,
          created_at: conversation.timestamp
        })

      // Also update active context if auto-update is enabled
      if (this.config.enableAutoUpdate) {
        const contextUpdate = `Recent conversation (${conversation.model_used}): ${conversation.user_message.substring(0, 200)}...`
        await this.updateActiveContext(contextUpdate)
      }
    } catch (error) {
      console.error('Error adding conversation to history:', error)
    }
  }

  async getRecentConversations(userId: string, limit?: number): Promise<ConversationEntry[]> {
    try {
      const supabase = await createClient()
      const queryLimit = limit || this.config.maxHistoryEntries || 10
      
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(queryLimit)

      if (error) throw error
      
      return data?.map(row => ({
        id: row.conversation_id,
        timestamp: row.created_at,
        user_message: row.user_message,
        assistant_response: row.assistant_response,
        model_used: row.model_used,
        tokens_used: row.tokens_used,
        project_context: row.project_context
      })) || []
    } catch (error) {
      console.error('Error fetching recent conversations:', error)
      return []
    }
  }

  async buildContextForPrompt(userId: string, includeHistory: boolean = true): Promise<string> {
    try {
      const memory = await this.readMemoryBank()
      let context = `# Project Context\n\n`
      
      // Add structured memory bank content
      if (memory.projectbrief) {
        context += `## Project Brief\n${memory.projectbrief}\n\n`
      }
      
      if (memory.systemPatterns) {
        context += `## System Patterns\n${memory.systemPatterns}\n\n`
      }
      
      if (memory.activeContext) {
        context += `## Active Context\n${memory.activeContext}\n\n`
      }

      // Add recent conversation history
      if (includeHistory) {
        const recentConversations = await this.getRecentConversations(userId)
        if (recentConversations.length > 0) {
          context += `## Recent Conversations\n`
          recentConversations.forEach(conv => {
            context += `**${conv.timestamp}** (${conv.model_used}):\n`
            context += `User: ${conv.user_message.substring(0, 300)}...\n`
            context += `Assistant: ${conv.assistant_response.substring(0, 300)}...\n\n`
          })
        }
      }

      return context
    } catch (error) {
      console.error('Error building context for prompt:', error)
      return ''
    }
  }

  private async readFileWithFallback(filePath: string, fallback: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8')
    } catch {
      return fallback
    }
  }

  private getDefaultProjectBrief(): string {
    return `# Project Brief

## Overview
This document serves as the foundation for understanding the project scope, requirements, and goals.

## Core Requirements
- [Add core requirements here]

## Goals
- [Add project goals here]

## Success Criteria
- [Add success criteria here]

---
*This file is automatically maintained by the Polydev Memory Bank system*
`
  }

  private getDefaultProductContext(): string {
    return `# Product Context

## Problem Statement
- [What problem does this project solve?]

## Target Users
- [Who are the intended users?]

## Product Functionality
- [What does the product do?]

## Business Value
- [Why does this project exist?]

---
*This file is automatically maintained by the Polydev Memory Bank system*
`
  }

  private getDefaultActiveContext(): string {
    return `# Active Context

## Current Focus
- [What are we currently working on?]

## Recent Changes
- [List recent changes and decisions]

## Important Patterns & Preferences
- [Document coding patterns and preferences]

## Next Steps
- [What needs to be done next?]

---
*This file is automatically maintained by the Polydev Memory Bank system*
`
  }

  private getDefaultSystemPatterns(): string {
    return `# System Patterns

## Architecture Decisions
- [Document key architectural decisions]

## Design Patterns
- [List important design patterns used]

## Component Relationships
- [Describe how components interact]

## Technical Constraints
- [Document any technical limitations]

---
*This file is automatically maintained by the Polydev Memory Bank system*
`
  }

  private getDefaultTechContext(): string {
    return `# Technical Context

## Technology Stack
- [List technologies and frameworks]

## Development Setup
- [Describe development environment]

## Dependencies
- [List key dependencies]

## Build & Deployment
- [Document build and deployment process]

---
*This file is automatically maintained by the Polydev Memory Bank system*
`
  }

  private getDefaultProgress(): string {
    return `# Progress Tracking

## Completed Features
- [List completed features]

## In Progress
- [What's currently being worked on]

## Known Issues
- [Document known issues]

## Future Plans
- [What's planned for the future]

---
*This file is automatically maintained by the Polydev Memory Bank system*
`
  }
}

export default MemoryBankManager