#!/usr/bin/env node

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

/**
 * Polydev Context Bridge Proxy
 * 
 * Intercepts MCP requests from Claude Code, injects local conversation context,
 * and forwards to remote Polydev MCP server for enhanced responses.
 */
class PolydevContextBridge {
  constructor(options = {}) {
    this.port = options.port || 8787;
    this.targetUrl = options.targetUrl || 'https://www.polydev.ai';
    this.claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
    this.contextCache = new Map(); // projectId -> { summary, recentTurns, updatedAt }
    this.app = express();
    
    console.log(`🚀 Polydev Context Bridge starting...`);
    console.log(`📁 Claude projects dir: ${this.claudeProjectsDir}`);
    console.log(`🎯 Target server: ${this.targetUrl}`);
  }

  /**
   * Get the most recent Claude project based on file modification times
   */
  getMostRecentProject() {
    try {
      const projectDirs = fs.readdirSync(this.claudeProjectsDir)
        .filter(dir => fs.statSync(path.join(this.claudeProjectsDir, dir)).isDirectory())
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.claudeProjectsDir, a));
          const statB = fs.statSync(path.join(this.claudeProjectsDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        });

      if (projectDirs.length === 0) return null;

      const recentProjectDir = path.join(this.claudeProjectsDir, projectDirs[0]);
      const conversationFiles = fs.readdirSync(recentProjectDir)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => ({
          name: file,
          path: path.join(recentProjectDir, file),
          mtime: fs.statSync(path.join(recentProjectDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return conversationFiles.length > 0 ? {
        projectId: projectDirs[0],
        conversationFile: conversationFiles[0].path
      } : null;
    } catch (error) {
      console.warn(`[Context Bridge] Could not access Claude projects:`, error.message);
      return null;
    }
  }

  /**
   * Extract and summarize recent conversations from Claude's .jsonl file
   */
  async extractProjectContext(projectInfo, limit = 6) {
    if (!projectInfo) return null;

    const cacheKey = projectInfo.projectId;
    const cached = this.contextCache.get(cacheKey);
    
    // Check if cache is still fresh (5 minutes)
    if (cached && Date.now() - cached.updatedAt < 5 * 60 * 1000) {
      return cached;
    }

    try {
      const conversations = [];
      const fileStream = fs.createReadStream(projectInfo.conversationFile);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        try {
          const entry = JSON.parse(line);
          
          // Extract user messages
          if (entry.type === 'user' && entry.message?.content) {
            const textContent = entry.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join(' ');
            
            if (textContent && textContent.length > 10) {
              conversations.push({
                role: 'user',
                text: textContent.substring(0, 800), // Limit size
                timestamp: entry.timestamp
              });
            }
          }
          
          // Extract assistant messages
          if (entry.type === 'assistant' && entry.message?.content) {
            const textContent = entry.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join(' ');
            
            if (textContent && textContent.length > 10) {
              conversations.push({
                role: 'assistant',
                text: textContent.substring(0, 800), // Limit size
                timestamp: entry.timestamp
              });
            }
          }
        } catch (e) {
          continue; // Skip invalid JSON lines
        }
      }

      // Get recent conversation turns
      const recentTurns = conversations.slice(-limit);
      
      // Generate a summary from recent conversations
      const summary = this.generateContextSummary(recentTurns);

      const context = {
        projectId: projectInfo.projectId,
        summary,
        recentTurns,
        updatedAt: Date.now(),
        contextStatus: recentTurns.length > 0 ? 'available' : 'empty'
      };

      // Cache the context
      this.contextCache.set(cacheKey, context);
      
      return context;
    } catch (error) {
      console.warn(`[Context Bridge] Error extracting context:`, error.message);
      return {
        projectId: projectInfo.projectId,
        contextStatus: 'error',
        updatedAt: Date.now()
      };
    }
  }

  /**
   * Generate a concise summary from recent conversation turns
   */
  generateContextSummary(turns) {
    if (!turns || turns.length === 0) return '';

    const topics = new Set();
    const keywords = new Set();
    
    turns.forEach(turn => {
      const text = turn.text.toLowerCase();
      
      // Extract topics
      if (text.includes('working on') || text.includes('implement') || text.includes('create')) {
        topics.add('development');
      }
      if (text.includes('debug') || text.includes('error') || text.includes('fix')) {
        topics.add('debugging');
      }
      if (text.includes('deploy') || text.includes('build') || text.includes('vercel')) {
        topics.add('deployment');
      }
      if (text.includes('database') || text.includes('supabase') || text.includes('sql')) {
        topics.add('database');
      }
      
      // Extract key terms
      const words = text.match(/\b\w{4,}\b/g) || [];
      words.slice(0, 5).forEach(word => keywords.add(word));
    });

    let summary = `Recent session: ${Array.from(topics).join(', ')}`;
    if (keywords.size > 0) {
      summary += `. Key terms: ${Array.from(keywords).slice(0, 8).join(', ')}`;
    }
    
    return summary.substring(0, 400); // Keep summary concise
  }

  /**
   * Middleware to inject context into MCP tool calls
   */
  async injectContext(req, res, next) {
    // Only process JSON-RPC requests with relevant methods
    if (req.method === 'POST' && req.body && req.body.method) {
      const method = req.body.method;
      
      // Inject context for tool calls and prompt requests
      if (method === 'tools/call' || method.includes('prompt') || method.includes('perspective')) {
        console.log(`[Context Bridge] Injecting context for method: ${method}`);
        
        const projectInfo = this.getMostRecentProject();
        const context = await this.extractProjectContext(projectInfo);
        
        if (context) {
          // Inject client_context into params
          req.body.params = req.body.params || {};
          req.body.params.client_context = context;
          
          console.log(`[Context Bridge] Context injected - status: ${context.contextStatus}, turns: ${context.recentTurns?.length || 0}`);
        }
      }
    }
    
    next();
  }

  /**
   * Start the context bridge server
   */
  start() {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // Health check endpoint
    this.app.get('/healthz', (req, res) => {
      res.json({ 
        status: 'ok', 
        bridge: 'polydev-context-bridge',
        target: this.targetUrl,
        cacheSize: this.contextCache.size 
      });
    });

    // Context injection middleware
    this.app.use(this.injectContext.bind(this));

    // Proxy all requests to Polydev MCP server
    this.app.use('/', createProxyMiddleware({
      target: this.targetUrl,
      changeOrigin: true,
      onError: (err, req, res) => {
        console.error(`[Context Bridge] Proxy error:`, err.message);
        res.status(500).json({ error: 'Context bridge proxy error' });
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log the request with context info
        if (req.body && req.body.params && req.body.params.client_context) {
          const ctx = req.body.params.client_context;
          console.log(`[Context Bridge] → ${req.body.method} with context (${ctx.contextStatus})`);
        }
      }
    }));

    // Start server
    this.app.listen(this.port, '127.0.0.1', () => {
      console.log(`✅ Polydev Context Bridge running at http://127.0.0.1:${this.port}`);
      console.log(`📝 Update Claude MCP config to: {"type": "http", "url": "http://127.0.0.1:${this.port}/api/mcp"}`);
      console.log(`🔄 All requests will be forwarded to ${this.targetUrl}`);
    });
  }
}

// Start the bridge if run directly
if (require.main === module) {
  const bridge = new PolydevContextBridge();
  bridge.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Polydev Context Bridge...');
    process.exit(0);
  });
}

module.exports = PolydevContextBridge;