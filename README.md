# Polydev AI Website

Advanced Model Context Protocol platform with comprehensive multi-LLM integrations, subscription-based CLI access, OAuth bridges, and advanced tooling for AI development.

## Features

### 🤖 **Comprehensive LLM Integration**
- **API-Based Providers**: Direct integration with 8+ providers (Anthropic, OpenAI, Google, etc.)
- **Subscription-Based CLI Access**: Use your existing ChatGPT Plus, Claude Pro, GitHub Copilot subscriptions
- **Unified Interface**: Single API for all providers with consistent streaming responses
- **Auto-Detection**: Automatic CLI tool discovery and path configuration

### 🔧 **CLI Provider Support**
- **Codex CLI**: Access GPT-5 with high reasoning through ChatGPT subscription
- **Claude Code CLI**: Use Claude via Anthropic subscription
- **Gemini CLI**: Google Cloud authentication integration
- **GitHub Copilot**: VS Code Language Model API integration

### 🛠 **Advanced Tooling**
- **Model Context Protocol (MCP)**: Hosted MCP server with OAuth authentication (like Vercel)
- **Multi-Authentication**: Both OAuth and API token support for maximum flexibility
- **Process Execution**: Cross-platform CLI management with timeout handling
- **Path Auto-Discovery**: Smart detection of CLI installations across Windows, macOS, Linux
- **Real-time Status**: Live CLI availability and authentication checking

### 🔒 **Security & Authentication**
- **Encrypted Storage**: Browser-based API key encryption
- **OAuth Bridges**: Secure authentication flows
- **Subscription Auth**: No API costs - use existing subscriptions
- **Local Storage**: Keys never leave your device

### 📊 **Monitoring & Analytics**  
- **PostHog Integration**: Advanced user analytics and feature tracking
- **BetterStack Monitoring**: System health and performance monitoring
- **Upstash Redis**: High-performance caching layer
- **Supabase Auth**: Robust authentication system

## Tech Stack

### **Frontend**
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Icons**: Lucide React
- **State Management**: React hooks with custom providers

### **LLM Integration** 
- **API Handlers**: Custom TypeScript handlers for each provider
- **CLI Integration**: Cross-platform process execution utilities
- **Streaming**: Server-Sent Events for real-time responses
- **Authentication**: Both API key and subscription-based authentication

### **Backend Services**
- **Analytics**: PostHog for user tracking and feature analytics
- **Monitoring**: BetterStack for system health and logging
- **Caching**: Upstash Redis for high-performance data caching
- **Authentication**: Supabase for user management and auth flows
- **Database**: Supabase PostgreSQL for user data

### **Security & Storage**
- **Encryption**: Browser SubtleCrypto API for client-side encryption
- **Storage**: Local browser storage with encrypted API keys
- **CORS**: Configured for secure cross-origin requests

### **Development & Deployment**
- **Package Manager**: npm with Node.js 18+
- **Build System**: Next.js with TypeScript compilation
- **Deployment**: Vercel with automatic deployments
- **Environment**: Support for multiple deployment environments

## Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm or yarn package manager
- (Optional) CLI tools for subscription-based access:
  - Codex CLI for ChatGPT Plus integration
  - Claude Code CLI for Anthropic Pro integration
  - Gemini CLI for Google Cloud integration
  - VS Code with GitHub Copilot for Copilot integration

### **Installation**

1. **Clone the repository**
```bash
git clone <repository-url>
cd polydev-website
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables** (see Environment Variables section)

4. **Start development server**
```bash
npm run dev
```

5. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

### **Quick Configuration**

1. **API Key Setup**: Go to Settings → API Keys tab to configure traditional API access
2. **CLI Setup**: Go to Settings → CLI Subscriptions tab to set up subscription-based access
3. **Provider Selection**: Choose your preferred LLM provider from the dropdown
4. **Test Integration**: Use the chat interface to test your configuration

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# BetterStack Logging
BETTERSTACK_LOGS_TOKEN=your_betterstack_token
```

## CLI Provider Setup

### **Codex CLI (ChatGPT Plus Integration)**

1. **Install Codex CLI**:
   - Download from [OpenAI's official repository](https://openai.com/chatgpt/desktop)
   - Ensure you have an active ChatGPT Plus subscription

2. **Authentication**:
   ```bash
   codex auth
   ```

3. **Verify Installation**:
   ```bash
   codex --version
   ```

### **Claude Code CLI (Anthropic Pro Integration)**

1. **Install Claude Code CLI**:
   - Follow instructions at [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
   - Requires active Claude Pro subscription

2. **Authentication**:
   ```bash
   claude login
   ```

3. **Verify Installation**:
   ```bash
   claude --version
   ```

### **Gemini CLI (Google Cloud Integration)**

1. **Install Google Cloud CLI**:
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Windows
   # Download from https://cloud.google.com/sdk/docs/install
   
   # Linux
   curl https://sdk.cloud.google.com | bash
   ```

2. **Authentication**:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

### **GitHub Copilot Integration**

1. **Install VS Code** with GitHub Copilot extension
2. **Authentication**: Sign in with your GitHub account that has Copilot access
3. **Verification**: The application will detect VS Code and Copilot availability automatically

## API Provider Configuration

### **Setting Up API Keys**

1. Navigate to Settings → API Keys tab
2. Select your preferred provider from the dropdown
3. Enter your API key (encrypted automatically)
4. Choose your preferred model
5. Test the configuration

### **Supported API Providers**

| Provider | Models | Context Window | Features |
|----------|--------|---------------|----------|
| **Anthropic** | Claude 3.5 Sonnet, Haiku, Opus | 200K tokens | Best for reasoning and code |
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5 | 128K tokens | Versatile, widely adopted |
| **Google Gemini** | Gemini 1.5 Pro, Flash | 1M+ tokens | Large context window |
| **OpenRouter** | 100+ models | Varies | Access to multiple providers |
| **Groq** | Open-source models | Varies | Ultra-fast inference |
| **Perplexity** | Search-optimized models | Varies | AI search and reasoning |
| **DeepSeek** | Reasoning models | Varies | Advanced reasoning capabilities |
| **Mistral AI** | European AI models | Varies | Strong performance, EU-based |

## Usage Examples

### **Basic Chat Interface**

1. Configure your preferred provider (API key or CLI)
2. Select a model from the dropdown
3. Start chatting in the main interface
4. Switch providers anytime without losing conversation history

### **CLI Provider Usage**

```typescript
// The application automatically detects CLI availability
// Users can configure custom paths if needed

// Example: Using Codex CLI for high reasoning
const response = await llmService.createCliMessage(
  'codex',
  'You are a helpful AI assistant',
  [{ role: 'user', content: 'Explain quantum computing' }],
  { temperature: 0.7 }
)
```

### **API Provider Usage**

```typescript
// Standard API key usage
const response = await llmService.createMessage(
  'You are a helpful AI assistant',
  [{ role: 'user', content: 'Write a Python function' }],
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
)
```

## Architecture Overview

### **CLI Integration Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│  Process Utils   │────│   CLI Tools     │
│   (React/TS)    │    │  (Node.js)       │    │   (External)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ LLM Service     │    │ CLI Handlers     │    │ Subscriptions   │
│ (Unified API)   │    │ (Per Provider)   │    │ (ChatGPT+, etc) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Security Model**

- **API Keys**: Encrypted using browser SubtleCrypto API
- **Local Storage**: Keys never leave your device
- **CLI Authentication**: Uses existing subscription authentication
- **Process Isolation**: CLI processes run in isolated environments

## Troubleshooting

### **CLI Provider Issues**

**Codex CLI not detected:**
1. Verify ChatGPT Plus subscription is active
2. Check installation path: `which codex`
3. Re-run authentication: `codex auth`
4. Configure custom path in Settings → CLI Subscriptions

**Claude Code CLI authentication failed:**
1. Ensure Claude Pro subscription
2. Run `claude login` manually
3. Check network connectivity
4. Verify CLI version compatibility

**Gemini CLI setup issues:**
1. Install Google Cloud SDK completely
2. Run both `gcloud auth` commands
3. Enable required APIs in Google Cloud Console
4. Check quota limits

**GitHub Copilot not available:**
1. Install VS Code with Copilot extension
2. Sign in to GitHub account with Copilot access
3. Restart the application
4. Check VS Code Language Model API availability

### **API Provider Issues**

**API key validation failed:**
1. Verify the key is correctly copied (no extra spaces)
2. Check if the key has required permissions
3. Ensure sufficient account credits/quota
4. Try regenerating the API key

**Connection timeout:**
1. Check internet connectivity
2. Verify firewall settings
3. Try different model/provider
4. Increase timeout in settings

**Model not available:**
1. Check provider documentation for model availability
2. Verify your account tier supports the model
3. Try alternative models from the same provider

## Development

### **Adding New CLI Providers**

1. **Create handler** in `src/lib/llm/handlers/`
2. **Update types** in `src/types/api-configuration.ts`
3. **Add configuration** to `CLI_PROVIDERS` constant
4. **Update UI** in `CliProviderConfiguration.tsx`
5. **Register handler** in `LLMService`

### **Adding New API Providers**

1. **Create handler** implementing `ApiHandler` interface
2. **Update `ApiProvider` type** and `PROVIDERS` configuration
3. **Add API key fields** to `ApiConfiguration`
4. **Update UI** components for new provider
5. **Add authentication logic**

## Performance Optimization

### **CLI Response Optimization**
- CLI processes are cached and reused when possible
- Streaming responses reduce perceived latency
- Process timeouts prevent hanging connections
- Cross-platform path detection minimizes setup time

### **API Response Optimization**
- Server-Sent Events for real-time streaming
- Connection pooling for API requests
- Response caching for repeated queries
- Automatic retry logic with exponential backoff

## Health Check

The application includes a health check endpoint at `/api/health` for monitoring purposes.
# Trigger deployment
