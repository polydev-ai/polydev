#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class MCPServer {
  constructor() {
    this.capabilities = {
      tools: {},
      resources: {},
      prompts: {}
    };
    
    this.tools = new Map();
    this.loadManifest();
  }

  loadManifest() {
    try {
      const manifestPath = path.join(__dirname, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Register tools from manifest
      if (manifest.tools) {
        manifest.tools.forEach(tool => {
          this.tools.set(tool.name, tool);
        });
      }
      
      this.manifest = manifest;
    } catch (error) {
      console.error('Failed to load manifest:', error);
      process.exit(1);
    }
  }

  async handleRequest(request) {
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(params, id);
        
        case 'tools/list':
          return this.handleToolsList(id);
        
        case 'tools/call':
          return await this.handleToolCall(params, id);
        
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      };
    }
  }

  handleInitialize(params, id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: this.manifest.name,
          version: this.manifest.version
        }
      }
    };
  }

  handleToolsList(id) {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    return {
      jsonrpc: '2.0',
      id,
      result: { tools }
    };
  }

  async handleToolCall(params, id) {
    const { name, arguments: args } = params;
    
    if (!this.tools.has(name)) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: `Unknown tool: ${name}`
        }
      };
    }

    try {
      let result;
      
      switch (name) {
        case 'get_perspectives':
          result = await this.callPerspectivesAPI(args);
          break;
        
        default:
          throw new Error(`Tool ${name} not implemented`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: this.formatPerspectivesResponse(result)
            }
          ]
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  async callPerspectivesAPI(args) {
    const serverUrl = this.manifest.configuration?.server_url || 'https://polydev.ai/api/perspectives';
    
    // Validate required arguments
    if (!args.prompt || typeof args.prompt !== 'string') {
      throw new Error('prompt is required and must be a string');
    }

    // Support both parameter token (Claude Code) and environment token (Cline)
    const userToken = args.user_token || process.env.POLYDEV_USER_TOKEN;
    
    // Debug logging
    console.error(`[Polydev MCP] Debug - args.user_token: ${args.user_token ? 'present' : 'missing'}`);
    console.error(`[Polydev MCP] Debug - process.env.POLYDEV_USER_TOKEN: ${process.env.POLYDEV_USER_TOKEN ? 'present' : 'missing'}`);
    console.error(`[Polydev MCP] Debug - final userToken: ${userToken ? 'present' : 'missing'}`);
    
    if (!userToken || typeof userToken !== 'string') {
      throw new Error('user_token is required. Either:\n' +
        '1. Pass user_token parameter, or\n' +
        '2. Set POLYDEV_USER_TOKEN environment variable\n' +
        'Generate token at: https://polydev.ai/dashboard/mcp-tools');
    }

    // Build request payload with defaults
    const payload = {
      prompt: args.prompt,
      user_token: userToken,
      mode: 'managed',
      models: args.models || ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      project_memory: args.project_memory || 'none',
      max_messages: args.max_messages || 10,
      temperature: args.temperature || 0.7,
      max_tokens: args.max_tokens || 2000,
      project_context: args.project_context || {}
    };

    // Add project context if project_memory is enabled
    if (payload.project_memory !== 'none' && !payload.project_context.root_path) {
      // Try to auto-detect project root
      const cwd = process.cwd();
      if (fs.existsSync(path.join(cwd, 'package.json')) || 
          fs.existsSync(path.join(cwd, '.git'))) {
        payload.project_context.root_path = cwd;
      }
    }

    console.error(`[Polydev MCP] Getting perspectives for: "${args.prompt.substring(0, 60)}${args.prompt.length > 60 ? '...' : ''}"`);
    console.error(`[Polydev MCP] Models: ${payload.models.join(', ')}`);
    console.error(`[Polydev MCP] Project memory: ${payload.project_memory}`);

    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'polydev-perspectives-mcp/1.0.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}. Generate a new token at https://polydev.ai/dashboard/mcp-tools`);
      }

      throw new Error(`Polydev API error: ${errorMessage}`);
    }

    const result = await response.json();
    console.error(`[Polydev MCP] Got ${result.responses?.length || 0} responses in ${result.total_latency_ms}ms`);
    
    return result;
  }

  formatPerspectivesResponse(result) {
    if (!result.responses || result.responses.length === 0) {
      return 'No perspectives received from models.';
    }

    let formatted = `# Multiple AI Perspectives\n\n`;
    formatted += `Got ${result.responses.length} perspectives in ${result.total_latency_ms}ms using ${result.total_tokens} tokens.\n\n`;

    result.responses.forEach((response, index) => {
      const modelName = response.model.toUpperCase();
      
      if (response.error) {
        formatted += `## ${modelName} - ERROR\n`;
        formatted += `❌ ${response.error}\n\n`;
      } else {
        formatted += `## ${modelName} Perspective\n`;
        formatted += `${response.content}\n\n`;
        if (response.tokens_used) {
          formatted += `*Tokens: ${response.tokens_used}, Latency: ${response.latency_ms}ms*\n\n`;
        }
      }
      
      if (index < result.responses.length - 1) {
        formatted += '---\n\n';
      }
    });

    return formatted;
  }

  async start() {
    console.log('Starting Polydev Perspectives MCP Server...');
    
    // Handle JSONRPC communication over stdio
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            const response = await this.handleRequest(request);
            process.stdout.write(JSON.stringify(response) + '\n');
          } catch (error) {
            console.error('Failed to process request:', error);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      console.log('MCP Server shutting down...');
      process.exit(0);
    });

    // Handle process signals
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down...');
      process.exit(0);
    });

    console.log('MCP Server ready and listening on stdin...');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new MCPServer();
  server.start().catch(error => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

module.exports = MCPServer;
