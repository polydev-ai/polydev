#!/usr/bin/env python3
"""
Claude Code CLI Bridge - Direct Claude Code CLI Wrapper MCP Server
Uses your existing authenticated Claude Code CLI directly
"""

import asyncio
import json
import os
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

app = Server("claude-code-cli-bridge")

class ClaudeCodeCLIWrapper:
    def __init__(self):
        # Try to find claude CLI in PATH
        self.claude_path = self.find_claude_cli()
        # Query logging
        self.query_log_file = os.path.expanduser("~/.config/cross-llm-bridge/claude_query_log.jsonl")
        self.ensure_log_dir()
        
    def find_claude_cli(self):
        """Find the claude CLI executable"""
        try:
            # Try 'claude' in PATH
            result = subprocess.run(['which', 'claude'], capture_output=True, text=True)
            if result.returncode == 0:
                return 'claude'
        except:
            pass
        
        # Common installation paths
        possible_paths = [
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
            os.path.expanduser('~/.local/bin/claude'),
            '/usr/bin/claude'
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        return 'claude'  # Default, let system handle it
    
    def ensure_log_dir(self):
        """Ensure log directory exists"""
        os.makedirs(os.path.dirname(self.query_log_file), exist_ok=True)
    
    def log_query(self, user_message, model_info=None, tokens_used=None, response_length=None):
        """Log query for tracking and analysis"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "query": user_message[:200] + "..." if len(user_message) > 200 else user_message,
                "model": model_info or "claude-3.5-sonnet",
                "tokens_used": tokens_used,
                "response_length": response_length
            }
            
            with open(self.query_log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception:
            pass  # Silent fail for logging
    
    def extract_model_info(self, output):
        """Extract model and usage info from Claude Code CLI output"""
        model = "claude-3.5-sonnet"  # Default Claude model
        tokens = None
        
        lines = output.split('\n')
        for line in lines:
            if 'model:' in line or 'Model:' in line:
                model = line.split(':')[1].strip()
            elif 'tokens' in line.lower() and any(char.isdigit() for char in line):
                try:
                    # Extract numbers from the line
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        tokens = int(numbers[0])
                except:
                    pass
        
        return model, tokens
    
    async def run_claude_process_with_progress(self, messages, system_prompt=None, model="claude-3.5-sonnet", progress_callback=None):
        """
        Run Claude Code CLI process with real-time progress updates
        """
        try:
            if progress_callback:
                await progress_callback("🔍 Initializing Claude Code CLI...")
                
            # Check if Claude Code CLI is available first
            try:
                if progress_callback:
                    await progress_callback("✅ Claude Code CLI found, checking authentication...")
                    
                version_check = await asyncio.create_subprocess_exec(
                    self.claude_path, '--version',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await version_check.communicate()
                
                if version_check.returncode != 0:
                    return "❌ Claude Code CLI not found or not working. Please install and authenticate Claude Code CLI first."
                    
            except FileNotFoundError:
                return "❌ Claude Code CLI not found. Please install Claude Code CLI and make sure it's in your PATH."
            
            if progress_callback:
                await progress_callback("🚀 Authentication verified, preparing query...")
                
            # Prepare the prompt for Claude
            user_message = ""
            if system_prompt:
                user_message += f"{system_prompt}\n\n"
            
            # Get the main user message
            for msg in messages:
                if msg.get('role') == 'user':
                    user_message += msg.get('content', '')
                    break
            
            if not user_message.strip():
                return "❌ No message to send"
            
            if progress_callback:
                await progress_callback("🧠 Starting Claude 3.5 Sonnet...")
                await progress_callback("⚡ Query sent to Claude, waiting for response...")
            
            # Run Claude Code CLI
            process = await asyncio.create_subprocess_exec(
                self.claude_path, "chat",
                "--model", model,
                user_message,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            if progress_callback:
                await progress_callback("🤔 Claude is thinking...")
            
            stdout, stderr = await process.communicate()
            
            if progress_callback:
                await progress_callback("✅ Response received, processing...")
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                if "authentication" in error_msg.lower() or "login" in error_msg.lower():
                    return "❌ Claude Code CLI authentication expired. Please run 'claude auth' to re-authenticate."
                return f"❌ Claude Code CLI Error: {error_msg}"
            
            response = stdout.decode().strip()
            
            # Extract model info and log query
            model_info, tokens_used = self.extract_model_info(response)
            
            # Clean response (remove CLI metadata)
            lines = response.split('\n')
            clean_response = []
            capture_response = False
            
            for line in lines:
                if line.startswith('[') and ('claude' in line.lower() or 'anthropic' in line.lower()):
                    capture_response = True
                    continue
                elif capture_response and line.strip():
                    if not line.startswith('[') and not line.startswith('model:') and not line.startswith('tokens'):
                        clean_response.append(line)
            
            # Create user-friendly response with model info
            final_response = ""
            
            # Add model info header
            final_response += f"🤖 **{model_info}**\n"
            if tokens_used:
                final_response += f"📊 Tokens used: {tokens_used}\n\n"
            else:
                final_response += "\n"
            
            # Add the response content
            response_content = '\n'.join(clean_response).strip()
            if response_content:
                final_response += response_content
            else:
                # Fallback to raw response
                final_response += response
                response_content = response  # For logging
            
            # Log the query
            self.log_query(
                user_message=user_message,
                model_info=model_info,
                tokens_used=tokens_used,
                response_length=len(response_content)
            )
            
            if progress_callback:
                await progress_callback("📊 Finalizing response with model info...")
                
            return final_response or "No response received from Claude Code CLI"
            
        except Exception as e:
            return f"❌ Error running Claude Code CLI: {str(e)}"
    
    async def run_claude_process(self, messages, system_prompt=None, model="claude-3.5-sonnet"):
        """
        Legacy method without progress - calls the new progress-enabled version
        """
        return await self.run_claude_process_with_progress(messages, system_prompt, model, None)

# Global wrapper instance
claude_wrapper = ClaudeCodeCLIWrapper()

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="send_to_claude_code",
            description="Send message to Claude 3.5 Sonnet using your existing authenticated Claude Code CLI",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Message to send to Claude for analysis"},
                    "system_prompt": {"type": "string", "description": "Optional system prompt for specialized context"},
                    "model": {"type": "string", "description": "Claude model to use (default: claude-3.5-sonnet)"}
                },
                "required": ["message"]
            }
        ),
        Tool(
            name="check_claude_code_status",
            description="Check if Claude Code CLI is installed and authenticated",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="claude_code_auth_help",
            description="Get help on how to authenticate with Claude Code CLI",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="claude_query_stats",
            description="View Claude Code CLI query statistics and usage logs",
            inputSchema={
                "type": "object",
                "properties": {
                    "last_n": {"type": "integer", "description": "Show last N queries (default: 10)"}
                }
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "check_claude_code_status":
        try:
            # Test if Claude Code CLI works
            process = await asyncio.create_subprocess_exec(
                claude_wrapper.claude_path, '--version',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                version_info = stdout.decode().strip()
                return [TextContent(type="text", text=f"✅ Claude Code CLI is working!\nVersion: {version_info}\nPath: {claude_wrapper.claude_path}")]
            else:
                error_msg = stderr.decode().strip()
                if "authentication" in error_msg.lower() or "login" in error_msg.lower():
                    return [TextContent(type="text", text="❌ Claude Code CLI found but not authenticated. Run 'claude auth' to authenticate.")]
                return [TextContent(type="text", text=f"❌ Claude Code CLI error: {error_msg}")]
                
        except FileNotFoundError:
            return [TextContent(type="text", text="❌ Claude Code CLI not found. Please install Claude Code CLI first.")]
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Error checking Claude Code CLI: {str(e)}")]
    
    elif name == "claude_code_auth_help":
        help_text = """
🔧 CLAUDE CODE CLI AUTHENTICATION SETUP:

1. **Install Claude Code CLI** (if not already installed):
   ```
   # Follow Anthropic's installation instructions
   # Usually available through their official releases
   ```

2. **Authenticate with your Anthropic account**:
   ```
   claude auth
   ```

3. **Test authentication**:
   ```
   claude --version
   ```

4. **Once authenticated**, this MCP server will use your existing Claude Code CLI authentication automatically!

✅ **Benefits of using Claude Code CLI**:
- Direct access to latest Claude models
- Uses your existing Anthropic API credits
- Same authentication as other Anthropic tools
- Handles all the OAuth complexity for you

📋 **If you get authentication errors**:
- Run `claude auth` to re-authenticate
- Make sure you're logged into the same account as your Anthropic subscription
"""
        return [TextContent(type="text", text=help_text)]
    
    elif name == "send_to_claude_code":
        message = arguments.get("message", "")
        system_prompt = arguments.get("system_prompt")
        model = arguments.get("model", "claude-3.5-sonnet")
        
        if not message:
            return [TextContent(type="text", text="❌ Message is required")]
        
        # Format messages for Claude Code CLI
        messages = [{"role": "user", "content": message}]
        
        # Create a simple progress tracker
        progress_messages = []
        
        async def progress_callback(status):
            progress_messages.append(f"⏳ {status}")
        
        # Send to Claude with specified model
        response = await claude_wrapper.run_claude_process_with_progress(
            messages=messages,
            system_prompt=system_prompt,
            model=model,
            progress_callback=progress_callback
        )
        
        # Combine progress messages with final response
        full_response = "\n".join(progress_messages) + "\n\n" + f"🤖 **Claude Code Analysis:**\n{response}"
        
        return [TextContent(type="text", text=full_response)]
    
    elif name == "claude_query_stats":
        try:
            last_n = arguments.get("last_n", 10)
            
            if not os.path.exists(claude_wrapper.query_log_file):
                return [TextContent(type="text", text="📊 No Claude queries logged yet.")]
            
            # Read recent queries
            queries = []
            with open(claude_wrapper.query_log_file, 'r') as f:
                for line in f:
                    try:
                        queries.append(json.loads(line))
                    except:
                        continue
            
            if not queries:
                return [TextContent(type="text", text="📊 No valid Claude query logs found.")]
            
            # Get recent queries
            recent_queries = queries[-last_n:]
            
            # Calculate stats
            total_queries = len(queries)
            total_tokens = sum(q.get('tokens_used', 0) for q in queries if q.get('tokens_used'))
            avg_tokens = total_tokens / len([q for q in queries if q.get('tokens_used')]) if queries else 0
            
            # Format response
            stats_text = f"📊 **Claude Code CLI Query Statistics**\n\n"
            stats_text += f"**Overall Stats:**\n"
            stats_text += f"• Total queries: {total_queries}\n"
            stats_text += f"• Total tokens used: {total_tokens:,}\n"
            stats_text += f"• Average tokens per query: {avg_tokens:.1f}\n\n"
            
            stats_text += f"**Recent {len(recent_queries)} Queries:**\n"
            for i, query in enumerate(reversed(recent_queries), 1):
                timestamp = query.get('timestamp', 'Unknown')[:19]  # Remove microseconds
                query_text = query.get('query', 'N/A')[:100] + ('...' if len(query.get('query', '')) > 100 else '')
                model = query.get('model', 'claude-3.5-sonnet')
                tokens = query.get('tokens_used', 'N/A')
                
                stats_text += f"{i}. **{timestamp}** ({model})\n"
                stats_text += f"   Query: {query_text}\n"
                stats_text += f"   Tokens: {tokens}\n\n"
            
            return [TextContent(type="text", text=stats_text)]
            
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Error reading Claude stats: {str(e)}")]
    
    return [TextContent(type="text", text=f"❌ Unknown tool: {name}")]

async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())