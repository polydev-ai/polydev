#!/usr/bin/env python3
"""
Gemini CLI Bridge - Direct Gemini CLI Wrapper MCP Server
Uses your existing authenticated Gemini CLI directly
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

app = Server("gemini-cli-bridge")

class GeminiCLIWrapper:
    def __init__(self):
        # Try to find gcloud CLI and gemini tools
        self.gcloud_path = self.find_gcloud_cli()
        # Query logging
        self.query_log_file = os.path.expanduser("~/.config/cross-llm-bridge/gemini_query_log.jsonl")
        self.ensure_log_dir()
        
    def find_gcloud_cli(self):
        """Find the gcloud CLI executable"""
        try:
            # Try 'gcloud' in PATH
            result = subprocess.run(['which', 'gcloud'], capture_output=True, text=True)
            if result.returncode == 0:
                return 'gcloud'
        except:
            pass
        
        # Common installation paths
        possible_paths = [
            '/usr/local/bin/gcloud',
            '/opt/homebrew/bin/gcloud',
            os.path.expanduser('~/google-cloud-sdk/bin/gcloud'),
            '/usr/bin/gcloud'
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        return 'gcloud'  # Default, let system handle it
    
    def ensure_log_dir(self):
        """Ensure log directory exists"""
        os.makedirs(os.path.dirname(self.query_log_file), exist_ok=True)
    
    def log_query(self, user_message, model_info=None, tokens_used=None, response_length=None):
        """Log query for tracking and analysis"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "query": user_message[:200] + "..." if len(user_message) > 200 else user_message,
                "model": model_info or "gemini-2.0-flash",
                "tokens_used": tokens_used,
                "response_length": response_length
            }
            
            with open(self.query_log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception:
            pass  # Silent fail for logging
    
    def extract_model_info(self, output):
        """Extract model and usage info from gcloud AI output"""
        model = "gemini-2.0-flash"  # Default Gemini model
        tokens = None
        
        lines = output.split('\n')
        for line in lines:
            if 'model:' in line or 'Model:' in line:
                model = line.split(':')[1].strip()
            elif 'token' in line.lower() and any(char.isdigit() for char in line):
                try:
                    # Extract numbers from the line
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        tokens = int(numbers[0])
                except:
                    pass
        
        return model, tokens
    
    async def run_gemini_process_with_progress(self, messages, system_prompt=None, model="gemini-2.0-flash", progress_callback=None):
        """
        Run Gemini via gcloud AI platform with real-time progress updates
        """
        try:
            if progress_callback:
                await progress_callback("🔍 Initializing Google Cloud AI Platform...")
                
            # Check if gcloud CLI is available first
            try:
                if progress_callback:
                    await progress_callback("✅ Google Cloud CLI found, checking authentication...")
                    
                auth_check = await asyncio.create_subprocess_exec(
                    self.gcloud_path, 'auth', 'list', '--filter=status:ACTIVE', '--format=value(account)',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await auth_check.communicate()
                
                if auth_check.returncode != 0 or not stdout.decode().strip():
                    return "❌ Google Cloud CLI not authenticated. Please run 'gcloud auth login' to authenticate."
                    
            except FileNotFoundError:
                return "❌ Google Cloud CLI not found. Please install Google Cloud CLI and make sure it's in your PATH."
            
            if progress_callback:
                await progress_callback("🚀 Authentication verified, preparing query...")
                
            # Prepare the prompt for Gemini
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
                await progress_callback("🧠 Starting Gemini 2.0 Flash...")
                await progress_callback("⚡ Query sent to Google AI, waiting for response...")
            
            # Create a temporary file for the prompt
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp_file:
                tmp_file.write(user_message)
                tmp_file_path = tmp_file.name
            
            try:
                # Run gcloud AI generative models predict
                process = await asyncio.create_subprocess_exec(
                    self.gcloud_path, 'ai', 'models', 'generate-text',
                    '--model', model,
                    '--prompt-file', tmp_file_path,
                    '--format', 'json',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                if progress_callback:
                    await progress_callback("🤔 Gemini is processing...")
                
                stdout, stderr = await process.communicate()
                
                if progress_callback:
                    await progress_callback("✅ Response received, processing...")
                
                if process.returncode != 0:
                    error_msg = stderr.decode() if stderr else "Unknown error"
                    if "authentication" in error_msg.lower() or "login" in error_msg.lower():
                        return "❌ Google Cloud authentication expired. Please run 'gcloud auth login' to re-authenticate."
                    if "quota" in error_msg.lower() or "limit" in error_msg.lower():
                        return "❌ Google Cloud quota exceeded. Please check your billing and quotas."
                    return f"❌ Google Cloud AI Error: {error_msg}"
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(tmp_file_path)
                except:
                    pass
            
            response = stdout.decode().strip()
            
            # Parse JSON response from gcloud
            try:
                response_data = json.loads(response)
                content = ""
                
                # Extract content from various possible response formats
                if isinstance(response_data, dict):
                    content = (response_data.get('predictions', [{}])[0].get('content', '') or 
                              response_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '') or
                              response_data.get('text', '') or
                              str(response_data))
                elif isinstance(response_data, list) and response_data:
                    content = response_data[0].get('content', '') or str(response_data[0])
                else:
                    content = str(response_data)
                    
            except json.JSONDecodeError:
                # Fallback to raw response if JSON parsing fails
                content = response
            
            # Extract model info and log query
            model_info, tokens_used = self.extract_model_info(response)
            
            # Create user-friendly response with model info
            final_response = ""
            
            # Add model info header
            final_response += f"🤖 **{model_info}**\n"
            if tokens_used:
                final_response += f"📊 Tokens used: {tokens_used}\n\n"
            else:
                final_response += "\n"
            
            # Add the response content
            if content and content.strip():
                final_response += content.strip()
            else:
                # Fallback to raw response
                final_response += f"⚠️ Raw response:\n{response}"
                content = response  # For logging
            
            # Log the query
            self.log_query(
                user_message=user_message,
                model_info=model_info,
                tokens_used=tokens_used,
                response_length=len(content)
            )
            
            if progress_callback:
                await progress_callback("📊 Finalizing response with model info...")
                
            return final_response or "No response received from Google Cloud AI"
            
        except Exception as e:
            return f"❌ Error running Google Cloud AI: {str(e)}"
    
    async def run_gemini_process(self, messages, system_prompt=None, model="gemini-2.0-flash"):
        """
        Legacy method without progress - calls the new progress-enabled version
        """
        return await self.run_gemini_process_with_progress(messages, system_prompt, model, None)

# Global wrapper instance
gemini_wrapper = GeminiCLIWrapper()

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="send_to_gemini",
            description="Send message to Gemini 2.0 Flash using your existing authenticated Google Cloud CLI",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Message to send to Gemini for analysis"},
                    "system_prompt": {"type": "string", "description": "Optional system prompt for specialized context"},
                    "model": {"type": "string", "description": "Gemini model to use (default: gemini-2.0-flash)"}
                },
                "required": ["message"]
            }
        ),
        Tool(
            name="check_gemini_status",
            description="Check if Google Cloud CLI is installed and authenticated for Gemini",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="gemini_auth_help",
            description="Get help on how to authenticate with Google Cloud CLI for Gemini",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="gemini_query_stats",
            description="View Gemini CLI query statistics and usage logs",
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
    if name == "check_gemini_status":
        try:
            # Test if Google Cloud CLI works and is authenticated
            process = await asyncio.create_subprocess_exec(
                gemini_wrapper.gcloud_path, 'auth', 'list', '--filter=status:ACTIVE', '--format=value(account)',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                active_account = stdout.decode().strip()
                if active_account:
                    return [TextContent(type="text", text=f"✅ Google Cloud CLI is working and authenticated!\nActive account: {active_account}\nPath: {gemini_wrapper.gcloud_path}")]
                else:
                    return [TextContent(type="text", text="❌ Google Cloud CLI found but not authenticated. Run 'gcloud auth login' to authenticate.")]
            else:
                error_msg = stderr.decode().strip()
                return [TextContent(type="text", text=f"❌ Google Cloud CLI error: {error_msg}")]
                
        except FileNotFoundError:
            return [TextContent(type="text", text="❌ Google Cloud CLI not found. Please install Google Cloud CLI first.")]
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Error checking Google Cloud CLI: {str(e)}")]
    
    elif name == "gemini_auth_help":
        help_text = """
🔧 GOOGLE CLOUD CLI AUTHENTICATION SETUP FOR GEMINI:

1. **Install Google Cloud CLI** (if not already installed):
   ```
   # Visit https://cloud.google.com/sdk/docs/install
   # Or use package manager:
   # brew install google-cloud-sdk  # macOS
   # sudo apt-get install google-cloud-cli  # Ubuntu
   ```

2. **Authenticate with your Google account**:
   ```
   gcloud auth login
   ```

3. **Set up Application Default Credentials**:
   ```
   gcloud auth application-default login
   ```

4. **Set your project** (if you have one):
   ```
   gcloud config set project YOUR_PROJECT_ID
   ```

5. **Enable Vertex AI API** (if using Vertex AI models):
   ```
   gcloud services enable aiplatform.googleapis.com
   ```

6. **Test authentication**:
   ```
   gcloud auth list
   ```

✅ **Benefits of using Google Cloud CLI for Gemini**:
- Direct access to latest Gemini models
- Uses your existing Google Cloud credits
- Access to Vertex AI features
- Handles all the OAuth complexity for you

📋 **If you get authentication errors**:
- Run `gcloud auth login` to re-authenticate
- Make sure you have the necessary permissions for AI services
- Check your project billing and quotas
"""
        return [TextContent(type="text", text=help_text)]
    
    elif name == "send_to_gemini":
        message = arguments.get("message", "")
        system_prompt = arguments.get("system_prompt")
        model = arguments.get("model", "gemini-2.0-flash")
        
        if not message:
            return [TextContent(type="text", text="❌ Message is required")]
        
        # Format messages for Gemini
        messages = [{"role": "user", "content": message}]
        
        # Create a simple progress tracker
        progress_messages = []
        
        async def progress_callback(status):
            progress_messages.append(f"⏳ {status}")
        
        # Send to Gemini with specified model
        response = await gemini_wrapper.run_gemini_process_with_progress(
            messages=messages,
            system_prompt=system_prompt,
            model=model,
            progress_callback=progress_callback
        )
        
        # Combine progress messages with final response
        full_response = "\n".join(progress_messages) + "\n\n" + f"🤖 **Gemini Analysis:**\n{response}"
        
        return [TextContent(type="text", text=full_response)]
    
    elif name == "gemini_query_stats":
        try:
            last_n = arguments.get("last_n", 10)
            
            if not os.path.exists(gemini_wrapper.query_log_file):
                return [TextContent(type="text", text="📊 No Gemini queries logged yet.")]
            
            # Read recent queries
            queries = []
            with open(gemini_wrapper.query_log_file, 'r') as f:
                for line in f:
                    try:
                        queries.append(json.loads(line))
                    except:
                        continue
            
            if not queries:
                return [TextContent(type="text", text="📊 No valid Gemini query logs found.")]
            
            # Get recent queries
            recent_queries = queries[-last_n:]
            
            # Calculate stats
            total_queries = len(queries)
            total_tokens = sum(q.get('tokens_used', 0) for q in queries if q.get('tokens_used'))
            avg_tokens = total_tokens / len([q for q in queries if q.get('tokens_used')]) if queries else 0
            
            # Format response
            stats_text = f"📊 **Gemini CLI Query Statistics**\n\n"
            stats_text += f"**Overall Stats:**\n"
            stats_text += f"• Total queries: {total_queries}\n"
            stats_text += f"• Total tokens used: {total_tokens:,}\n"
            stats_text += f"• Average tokens per query: {avg_tokens:.1f}\n\n"
            
            stats_text += f"**Recent {len(recent_queries)} Queries:**\n"
            for i, query in enumerate(reversed(recent_queries), 1):
                timestamp = query.get('timestamp', 'Unknown')[:19]  # Remove microseconds
                query_text = query.get('query', 'N/A')[:100] + ('...' if len(query.get('query', '')) > 100 else '')
                model = query.get('model', 'gemini-2.0-flash')
                tokens = query.get('tokens_used', 'N/A')
                
                stats_text += f"{i}. **{timestamp}** ({model})\n"
                stats_text += f"   Query: {query_text}\n"
                stats_text += f"   Tokens: {tokens}\n\n"
            
            return [TextContent(type="text", text=stats_text)]
            
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Error reading Gemini stats: {str(e)}")]
    
    return [TextContent(type="text", text=f"❌ Unknown tool: {name}")]

async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())