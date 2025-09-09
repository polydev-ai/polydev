/**
 * Universal Memory Extraction System
 * Extracts memory from ALL CLI tools with zero-knowledge encryption
 * Preserves existing functionality while adding comprehensive memory support
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createClient } from '@/app/utils/supabase/server';
import { ZeroKnowledgeEncryption } from './zeroKnowledgeEncryption';

export interface MemorySource {
  cli_tool: string;
  memory_type: 'global' | 'project' | 'conversation' | 'config';
  file_path: string;
  exists: boolean;
  size_bytes?: number;
  last_modified?: Date;
}

export interface ExtractedMemory {
  source: MemorySource;
  content: string;
  relevance_score: number;
  extraction_method: string;
  project_identifier?: string;
}

export interface ConversationEntry {
  timestamp: Date;
  user_message: string;
  assistant_response: string;
  model_used?: string;
  tokens_used?: number;
  relevance_score?: number;
}

export class UniversalMemoryExtractor {
  private homeDir: string;
  private encryption: ZeroKnowledgeEncryption;
  
  // Memory location patterns for all supported CLI tools
  private readonly MEMORY_PATTERNS = {
    claude_code: {
      global: [
        '~/.claude/CLAUDE.md',
        '~/.claude/global_memory.md',
        '~/.claude/config.json'
      ],
      project: [
        'CLAUDE.md',
        '.claude/CLAUDE.md',
        '.claude/project_memory.md'
      ],
      conversations: [
        '~/.claude/projects/*/conversations/*.jsonl',
        '~/.claude/conversations/*.jsonl'
      ],
      config: ['~/.claude/config.json']
    },
    cline: {
      global: [
        '~/.cline/global_memory.md',
        '~/.cline/settings.json',
        '~/.cline/config.json'
      ],
      project: [
        '.cline/project_memory.md',
        '.cline/cline_project.json',
        '.cline/memory.md'
      ],
      conversations: [
        '.cline/conversations/*.json',
        '.cline/chat_history.json'
      ],
      config: ['.cline/cline_config.json', '.cline/settings.json']
    },
    codex_cli: {
      global: [
        '~/.codex/memory.json',
        '~/.codex/config.yaml',
        '~/.codex/global_context.md'
      ],
      project: [
        '.codex/project_context.json',
        '.codex/memory.md',
        '.codex/context.json'
      ],
      conversations: [
        '~/.codex/conversations/*.json',
        '.codex/history.json'
      ],
      config: ['~/.codex/config.json', '~/.codex/config.yaml']
    },
    cursor: {
      global: [
        '~/.cursor/memory.json',
        '~/.cursor/settings.json',
        '~/.cursor/global_context.md'
      ],
      project: [
        '.cursor/project.json',
        '.cursor/workspace_context.json',
        '.cursor/memory.md'
      ],
      conversations: [
        '.cursor/chat_history.json',
        '.cursor/conversations/*.json'
      ],
      config: ['.cursor/settings.json']
    },
    continue: {
      global: [
        '~/.continue/config.json',
        '~/.continue/memory.json',
        '~/.continue/global_context.md'
      ],
      project: [
        '.continue/config.json',
        '.continue/memory.md',
        '.continue/project_context.json'
      ],
      conversations: [
        '.continue/sessions/*.json',
        '.continue/chat_history.json'
      ],
      config: ['.continue/config.json']
    },
    aider: {
      global: [
        '~/.aider.conf.yml',
        '~/.aider/memory.json',
        '~/.aider/global_context.md'
      ],
      project: [
        '.aider.conf.yml',
        '.aider/project_memory.md',
        '.aider/context.md'
      ],
      conversations: [
        '.aider/chat_history.json',
        '.aider/sessions/*.json'
      ],
      config: ['.aider.conf.yml']
    },
    generic: {
      global: [
        '~/.ai/global_memory.md',
        '~/.ai/config.json'
      ],
      project: [
        'ai_memory.md',
        'project_context.md',
        '.ai/memory.json',
        '.ai/context.md'
      ],
      conversations: [
        'ai_conversations.json',
        '.ai/history.json',
        'chat_history.json'
      ],
      config: ['~/.ai/config.json']
    }
  };

  constructor() {
    this.homeDir = os.homedir();
    this.encryption = new ZeroKnowledgeEncryption();
  }

  /**
   * Initialize the memory extractor
   */
  async initialize(): Promise<void> {
    await this.encryption.initialize();
  }

  /**
   * Detect all available memory sources for specified CLI tools
   */
  async detectMemorySources(
    projectPath: string = process.cwd(),
    cliTools: string[] = ['all']
  ): Promise<MemorySource[]> {
    const sources: MemorySource[] = [];
    const toolsToCheck = cliTools.includes('all') 
      ? Object.keys(this.MEMORY_PATTERNS)
      : cliTools;

    for (const tool of toolsToCheck) {
      const patterns = this.MEMORY_PATTERNS[tool as keyof typeof this.MEMORY_PATTERNS];
      if (!patterns) continue;

      // Check global memory sources
      if (patterns.global) {
        for (const pattern of patterns.global) {
          const resolved = this.resolvePath(pattern);
          const exists = await this.fileExists(resolved);
          
          sources.push({
            cli_tool: tool,
            memory_type: 'global',
            file_path: resolved,
            exists,
            ...(exists && await this.getFileStats(resolved))
          });
        }
      }

      // Check project memory sources
      if (patterns.project) {
        for (const pattern of patterns.project) {
          const resolved = path.resolve(projectPath, pattern);
          const exists = await this.fileExists(resolved);
          
          sources.push({
            cli_tool: tool,
            memory_type: 'project',
            file_path: resolved,
            exists,
            ...(exists && await this.getFileStats(resolved))
          });
        }
      }

      // Check conversation sources (simplified glob pattern matching)
      if (patterns.conversations) {
        for (const pattern of patterns.conversations) {
          const conversationSources = await this.findConversationFiles(pattern, projectPath);
          sources.push(...conversationSources.map(filePath => ({
            cli_tool: tool,
            memory_type: 'conversation' as const,
            file_path: filePath,
            exists: true
          })));
        }
      }
    }

    return sources.filter(source => source.exists);
  }

  /**
   * Extract memory from detected sources
   */
  async extractMemory(
    sources: MemorySource[],
    options: {
      encryptContent?: boolean;
      maxFileSizeKB?: number;
      relevanceThreshold?: number;
    } = {}
  ): Promise<ExtractedMemory[]> {
    const {
      encryptContent = true,
      maxFileSizeKB = 500,
      relevanceThreshold = 0.3
    } = options;

    const extractedMemories: ExtractedMemory[] = [];

    for (const source of sources) {
      if (!source.exists) continue;
      
      try {
        // Skip large files
        if (source.size_bytes && source.size_bytes > maxFileSizeKB * 1024) {
          console.warn(`[Memory Extractor] Skipping large file: ${source.file_path} (${source.size_bytes} bytes)`);
          continue;
        }

        const content = await fs.readFile(source.file_path, 'utf-8');
        const relevanceScore = this.calculateRelevanceScore(content, source);

        // Skip low-relevance content
        if (relevanceScore < relevanceThreshold) {
          continue;
        }

        const extractedMemory: ExtractedMemory = {
          source,
          content,
          relevance_score: relevanceScore,
          extraction_method: this.getExtractionMethod(source),
          project_identifier: this.extractProjectIdentifier(source.file_path)
        };

        extractedMemories.push(extractedMemory);
      } catch (error) {
        console.warn(`[Memory Extractor] Failed to read ${source.file_path}:`, error);
        continue;
      }
    }

    return extractedMemories.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Extract recent conversations from CLI tools
   */
  async extractRecentConversations(
    sources: MemorySource[],
    options: {
      limit?: number;
      timeRangeHours?: number;
      queryContext?: string;
    } = {}
  ): Promise<ConversationEntry[]> {
    const { limit = 10, timeRangeHours = 24, queryContext = '' } = options;
    const conversations: ConversationEntry[] = [];
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const conversationSources = sources.filter(s => s.memory_type === 'conversation');

    for (const source of conversationSources) {
      try {
        const content = await fs.readFile(source.file_path, 'utf-8');
        const extracted = this.parseConversations(content, source.cli_tool, cutoffTime);
        conversations.push(...extracted);
      } catch (error) {
        console.warn(`[Memory Extractor] Failed to parse conversations from ${source.file_path}:`, error);
      }
    }

    // Sort by relevance if query context provided, otherwise by timestamp
    if (queryContext) {
      conversations.forEach(conv => {
        conv.relevance_score = this.calculateConversationRelevance(conv, queryContext);
      });
      conversations.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    } else {
      conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return conversations.slice(0, limit);
  }

  /**
   * Store extracted memory in database with encryption
   */
  async storeMemory(
    userId: string,
    extractedMemories: ExtractedMemory[],
    useEncryption: boolean = true
  ): Promise<void> {
    const supabase = await createClient();

    for (const memory of extractedMemories) {
      try {
        let storedContent = memory.content;
        let encryptedContent: string | null = null;
        let contentHash: string;

        if (useEncryption) {
          const encrypted = await this.encryption.encrypt(memory.content);
          encryptedContent = JSON.stringify(encrypted);
          contentHash = await this.encryption.createContentHash(memory.content);
        } else {
          contentHash = await this.encryption.createContentHash(memory.content);
        }

        const sourcePathHash = await this.encryption.createContentHash(memory.source.file_path);

        // Insert into user_cli_memory_sources
        await supabase
          .from('user_cli_memory_sources')
          .upsert({
            user_id: userId,
            cli_tool: memory.source.cli_tool,
            memory_type: memory.source.memory_type,
            source_path_hash: sourcePathHash,
            encrypted_content: encryptedContent,
            content_hash: contentHash,
            file_count: 1,
            last_modified: memory.source.last_modified?.toISOString(),
            extraction_method: memory.extraction_method,
            relevance_score: memory.relevance_score,
            project_identifier: memory.project_identifier,
            encryption_version: useEncryption ? 1 : 0
          }, {
            onConflict: 'user_id,cli_tool,memory_type,source_path_hash'
          });

        // Log the extraction for audit
        await this.logMemoryAccess(userId, {
          action_type: 'extract',
          cli_tool: memory.source.cli_tool,
          memory_type: memory.source.memory_type,
          sources_processed: 1,
          bytes_processed: memory.content.length,
          privacy_mode: useEncryption
        });

      } catch (error) {
        console.error(`[Memory Extractor] Failed to store memory for ${memory.source.file_path}:`, error);
      }
    }
  }

  /**
   * Store conversations with encryption
   */
  async storeConversations(
    userId: string,
    conversations: ConversationEntry[],
    useEncryption: boolean = true
  ): Promise<void> {
    const supabase = await createClient();

    for (const conv of conversations) {
      try {
        let encryptedUserMessage: string | null = null;
        let encryptedAssistantResponse: string | null = null;
        let conversationHash: string;

        const conversationText = `${conv.user_message}\n\n${conv.assistant_response}`;

        if (useEncryption) {
          const encryptedUser = await this.encryption.encrypt(conv.user_message);
          const encryptedAssistant = await this.encryption.encrypt(conv.assistant_response);
          encryptedUserMessage = JSON.stringify(encryptedUser);
          encryptedAssistantResponse = JSON.stringify(encryptedAssistant);
          conversationHash = await this.encryption.createContentHash(conversationText);
        } else {
          conversationHash = await this.encryption.createContentHash(conversationText);
        }

        // Insert into mcp_conversation_memory (extending existing table)
        await supabase
          .from('mcp_conversation_memory')
          .upsert({
            user_id: userId,
            user_message: useEncryption ? '' : conv.user_message,
            assistant_response: useEncryption ? '' : conv.assistant_response,
            encrypted_user_message: encryptedUserMessage,
            encrypted_assistant_response: encryptedAssistantResponse,
            model_used: conv.model_used || 'unknown',
            tokens_used: conv.tokens_used || 0,
            conversation_hash: conversationHash,
            encryption_version: useEncryption ? 1 : 0,
            privacy_mode: useEncryption,
            created_at: conv.timestamp.toISOString()
          }, {
            onConflict: 'conversation_hash'
          });

      } catch (error) {
        console.error('[Memory Extractor] Failed to store conversation:', error);
      }
    }
  }

  /**
   * Get comprehensive memory context for injection
   */
  async getContextForInjection(
    userId: string,
    queryContext: string = '',
    options: {
      maxMemoryKB?: number;
      maxConversations?: number;
      cliTools?: string[];
      memoryTypes?: string[];
    } = {}
  ): Promise<{
    memory: string;
    conversations: string;
    totalSizeKB: number;
    sourcesUsed: string[];
  }> {
    const supabase = await createClient();
    const { maxMemoryKB = 50, maxConversations = 6 } = options;
    
    let memory = '';
    let conversations = '';
    let totalSize = 0;
    const sourcesUsed: string[] = [];

    try {
      // Get relevant memory sources
      const { data: memorySources } = await supabase
        .from('user_cli_memory_sources')
        .select('*')
        .eq('user_id', userId)
        .gte('relevance_score', 0.5)
        .order('relevance_score', { ascending: false })
        .limit(20);

      if (memorySources) {
        for (const source of memorySources) {
          if (totalSize > maxMemoryKB * 1024) break;

          let content = '';
          if (source.encrypted_content) {
            try {
              const encryptedData = JSON.parse(source.encrypted_content);
              content = await this.encryption.decrypt(encryptedData);
            } catch (error) {
              console.warn('[Memory Context] Failed to decrypt memory source:', error);
              continue;
            }
          }

          if (content) {
            const contextEntry = `[${source.cli_tool}:${source.memory_type}]\n${content}\n\n`;
            if (totalSize + contextEntry.length <= maxMemoryKB * 1024) {
              memory += contextEntry;
              totalSize += contextEntry.length;
              sourcesUsed.push(`${source.cli_tool}:${source.memory_type}`);
            }
          }
        }
      }

      // Get relevant conversations
      const { data: recentConversations } = await supabase
        .from('mcp_conversation_memory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxConversations);

      if (recentConversations) {
        for (const conv of recentConversations.slice(0, maxConversations)) {
          let userMsg = conv.user_message;
          let assistantResp = conv.assistant_response;

          if (conv.encrypted_user_message && conv.encrypted_assistant_response) {
            try {
              const encryptedUser = JSON.parse(conv.encrypted_user_message);
              const encryptedAssistant = JSON.parse(conv.encrypted_assistant_response);
              userMsg = await this.encryption.decrypt(encryptedUser);
              assistantResp = await this.encryption.decrypt(encryptedAssistant);
            } catch (error) {
              console.warn('[Memory Context] Failed to decrypt conversation:', error);
              continue;
            }
          }

          const convEntry = `[Conversation ${conv.created_at}]\nUser: ${userMsg}\nAssistant: ${assistantResp}\n\n`;
          conversations += convEntry;
        }
      }

    } catch (error) {
      console.error('[Memory Context] Failed to get context:', error);
    }

    return {
      memory: memory.trim(),
      conversations: conversations.trim(),
      totalSizeKB: Math.round(totalSize / 1024),
      sourcesUsed
    };
  }

  // Private helper methods

  private resolvePath(pathPattern: string): string {
    return pathPattern.replace('~', this.homeDir);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async getFileStats(filePath: string): Promise<{ size_bytes: number; last_modified: Date }> {
    const stats = await fs.stat(filePath);
    return {
      size_bytes: stats.size,
      last_modified: stats.mtime
    };
  }

  private async findConversationFiles(pattern: string, projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const resolved = pattern.includes('~') ? this.resolvePath(pattern) : path.resolve(projectPath, pattern);
      const dir = path.dirname(resolved.replace('*', ''));
      
      if (await this.fileExists(dir)) {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stats = await fs.stat(fullPath);
          if (stats.isFile() && (entry.endsWith('.json') || entry.endsWith('.jsonl'))) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Silently handle directory access errors
    }

    return files;
  }

  private calculateRelevanceScore(content: string, source: MemorySource): number {
    let score = 0.5; // Base score

    // Boost for project-level memory
    if (source.memory_type === 'project') score += 0.2;
    
    // Boost for recent conversations
    if (source.memory_type === 'conversation') score += 0.1;

    // Boost for certain CLI tools
    if (['claude_code', 'cursor', 'cline'].includes(source.cli_tool)) score += 0.1;

    // Content quality indicators
    if (content.includes('TODO') || content.includes('FIXME')) score += 0.1;
    if (content.includes('pattern') || content.includes('decision')) score += 0.1;
    if (content.length > 1000 && content.length < 10000) score += 0.1;

    return Math.min(score, 1.0);
  }

  private getExtractionMethod(source: MemorySource): string {
    const ext = path.extname(source.file_path).toLowerCase();
    switch (ext) {
      case '.md': return 'markdown_parse';
      case '.json': return 'json_parse';
      case '.jsonl': return 'jsonl_parse';
      case '.yml':
      case '.yaml': return 'yaml_parse';
      default: return 'text_parse';
    }
  }

  private extractProjectIdentifier(filePath: string): string {
    const parts = filePath.split(path.sep);
    const projectIndex = parts.findIndex(part => !part.startsWith('.') && part !== 'home' && part !== 'Users');
    return projectIndex >= 0 ? parts.slice(projectIndex, projectIndex + 2).join('/') : 'unknown';
  }

  private parseConversations(content: string, cliTool: string, cutoffTime: Date): ConversationEntry[] {
    const conversations: ConversationEntry[] = [];

    try {
      if (cliTool === 'claude_code' && content.includes('"type":"message"')) {
        // Parse Claude Code JSONL format
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'message' && entry.timestamp) {
              const timestamp = new Date(entry.timestamp);
              if (timestamp > cutoffTime) {
                conversations.push({
                  timestamp,
                  user_message: entry.content || '',
                  assistant_response: entry.response || '',
                  model_used: entry.model,
                  tokens_used: entry.tokens
                });
              }
            }
          } catch {}
        }
      } else if (content.startsWith('[') || content.startsWith('{')) {
        // Parse JSON format conversations
        const data = JSON.parse(content);
        const messages = Array.isArray(data) ? data : data.messages || [];
        
        for (let i = 0; i < messages.length - 1; i += 2) {
          const userMsg = messages[i];
          const assistantMsg = messages[i + 1];
          
          if (userMsg && assistantMsg) {
            const timestamp = new Date(userMsg.timestamp || assistantMsg.timestamp || Date.now());
            if (timestamp > cutoffTime) {
              conversations.push({
                timestamp,
                user_message: userMsg.content || userMsg.text || '',
                assistant_response: assistantMsg.content || assistantMsg.text || '',
                model_used: assistantMsg.model,
                tokens_used: assistantMsg.tokens
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[Memory Extractor] Failed to parse conversations for ${cliTool}:`, error);
    }

    return conversations;
  }

  private calculateConversationRelevance(conversation: ConversationEntry, queryContext: string): number {
    if (!queryContext) return 0.5;

    const text = `${conversation.user_message} ${conversation.assistant_response}`.toLowerCase();
    const queryWords = queryContext.toLowerCase().split(/\s+/);
    const matches = queryWords.filter(word => text.includes(word)).length;
    
    return Math.min(matches / queryWords.length, 1.0);
  }

  private async logMemoryAccess(userId: string, logData: {
    action_type: string;
    cli_tool?: string;
    memory_type?: string;
    sources_processed?: number;
    bytes_processed?: number;
    privacy_mode?: boolean;
  }): Promise<void> {
    const supabase = await createClient();
    
    try {
      await supabase
        .from('user_memory_audit_log')
        .insert({
          user_id: userId,
          ...logData
        });
    } catch (error) {
      console.error('[Memory Extractor] Failed to log memory access:', error);
    }
  }
}

// Export singleton instance
export const universalMemoryExtractor = new UniversalMemoryExtractor();