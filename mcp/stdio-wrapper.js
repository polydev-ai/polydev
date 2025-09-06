#!/usr/bin/env node

// Simple stdio wrapper that calls the remote Polydev MCP server
const fs = require('fs');
const path = require('path');

class StdioMCPWrapper {
  constructor() {
    this.userToken = process.env.POLYDEV_USER_TOKEN;
    if (!this.userToken) {
      console.error('POLYDEV_USER_TOKEN environment variable is required');
      process.exit(1);
    }
    
    // Load manifest for tool definitions
    this.loadManifest();
  }

  loadManifest() {
    try {
      const manifestPath = path.join(__dirname, 'manifest.json');
      this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: {
                name: this.manifest.name,
                version: this.manifest.version
              }
            }
          };
        
        case 'tools/list':
          const tools = this.manifest.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }));
          
          return {
            jsonrpc: '2.0',
            id,
            result: { tools }
          };
        
        case 'tools/call':
          // Forward the call directly to the remote server
          const result = await this.forwardToRemoteServer(request);
          return result;
        
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
          message: error.message
        }
      };
    }
  }

  async forwardToRemoteServer(request) {
    console.error(`[Stdio Wrapper] Forwarding request to remote server`);
    
    const response = await fetch('https://www.polydev.ai/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.userToken}`,
        'User-Agent': 'polydev-stdio-wrapper/1.0.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Stdio Wrapper] Remote server error: ${response.status} - ${errorText}`);
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Remote server error: ${response.status} - ${errorText}`
        }
      };
    }

    const result = await response.json();
    console.error(`[Stdio Wrapper] Got response from remote server`);
    return result;
  }

  async start() {
    console.log('Starting Polydev Stdio MCP Wrapper...');
    
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
      console.log('Stdio MCP Wrapper shutting down...');
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

    console.log('Stdio MCP Wrapper ready and listening on stdin...');
  }
}

if (require.main === module) {
  const wrapper = new StdioMCPWrapper();
  wrapper.start().catch(error => {
    console.error('Failed to start wrapper:', error);
    process.exit(1);
  });
}

module.exports = StdioMCPWrapper;
