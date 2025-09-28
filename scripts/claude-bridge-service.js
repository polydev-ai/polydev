#!/usr/bin/env node

/**
 * Claude CLI Bridge Service
 *
 * This service runs locally on the user's machine and provides a REST API
 * that Polydev can use to proxy requests to the Claude CLI with OAuth tokens.
 *
 * Usage:
 *   node claude-bridge-service.js [--port 3001] [--cors-origin https://polydev.ai]
 */

const express = require('express')
const cors = require('cors')
const { exec } = require('child_process')
const { promisify } = require('util')
const crypto = require('crypto')

const execAsync = promisify(exec)
const app = express()

// Configuration
const PORT = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1])
  : 3001

const CORS_ORIGIN = process.argv.includes('--cors-origin')
  ? process.argv[process.argv.indexOf('--cors-origin') + 1]
  : 'https://polydev.ai'

// Security: Generate API key for this session
const API_KEY = crypto.randomBytes(32).toString('hex')

// Middleware
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:3000', 'https://localhost:3000'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Security middleware - require API key
app.use((req, res, next) => {
  if (req.path === '/status' || req.path === '/health') {
    return next()
  }

  const apiKey = req.headers['x-bridge-api-key']
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized - Invalid or missing X-Bridge-API-Key header'
    })
  }
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'claude-bridge',
    timestamp: new Date().toISOString()
  })
})

// Status endpoint - returns configuration
app.get('/status', (req, res) => {
  res.json({
    service: 'Claude CLI Bridge Service',
    version: '1.0.0',
    port: PORT,
    corsOrigin: CORS_ORIGIN,
    apiKey: API_KEY, // Client needs this to authenticate
    claudeCliPath: findClaudeCli(),
    timestamp: new Date().toISOString()
  })
})

// Find Claude CLI binary
function findClaudeCli() {
  const paths = [
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.nvm/versions/node/v22.20.0/bin/claude`,
    'claude' // In PATH
  ]

  // This is synchronous for simplicity - in real usage we'd cache this
  for (const path of paths) {
    try {
      require('child_process').execSync(`${path} --version`, { stdio: 'ignore' })
      return path
    } catch (error) {
      continue
    }
  }
  return null
}

// Map our model names to Claude CLI model names
function mapModelToClaudeCli(model) {
  const modelMap = {
    'claude-sonnet-4-20250514': 'claude-sonnet-4-20250514',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022'
  }

  return modelMap[model] || 'claude-sonnet-4-20250514'
}

// Format Claude CLI response to match OpenAI format
function formatResponse(data, model, requestId) {
  // Handle different response formats from Claude CLI
  let content = ''
  if (typeof data === 'string') {
    content = data.trim()
  } else if (data.result) {
    content = data.result
  } else if (data.content) {
    content = data.content
  } else if (data.response) {
    content = data.response
  } else if (data.text) {
    content = data.text
  } else {
    content = JSON.stringify(data)
  }

  return {
    id: requestId || `claude-bridge-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: content
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  }
}

// Main proxy endpoint
app.post('/claude-proxy', async (req, res) => {
  try {
    const { model, messages, stream = false, temperature, max_tokens } = req.body

    if (!model || !messages) {
      return res.status(400).json({
        error: 'Missing required fields: model and messages'
      })
    }

    console.log(`[Bridge] Proxying request to ${model}`)

    // Find Claude CLI binary
    const claudeCliPath = findClaudeCli()
    if (!claudeCliPath) {
      return res.status(500).json({
        error: 'Claude CLI not found. Please ensure Claude Code is installed.'
      })
    }

    // Extract the user message (last user message)
    const userMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    if (!userMessage) {
      return res.status(400).json({
        error: 'No user message found in messages array'
      })
    }

    // Build Claude CLI command
    const args = [
      '--print',
      '--output-format', 'json',
      '--model', mapModelToClaudeCli(model)
    ]

    // Add optional parameters
    if (temperature !== undefined) {
      args.push('--temperature', temperature.toString())
    }
    if (max_tokens !== undefined) {
      args.push('--max-tokens', max_tokens.toString())
    }

    // Add the user message (properly escaped)
    args.push(`"${userMessage.replace(/"/g, '\\"')}"`)

    const command = `${claudeCliPath} ${args.join(' ')}`
    console.log(`[Bridge] Executing: ${command}`)

    // Execute Claude CLI
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    if (stderr) {
      console.warn('[Bridge] Claude CLI stderr:', stderr)
    }

    if (!stdout) {
      return res.status(500).json({
        error: 'No output received from Claude CLI'
      })
    }

    console.log('[Bridge] Raw Claude CLI output:', stdout.substring(0, 200) + '...')

    // Try to parse as JSON first
    let responseData
    try {
      responseData = JSON.parse(stdout)
    } catch (parseError) {
      console.warn('[Bridge] Failed to parse as JSON, treating as plain text')
      responseData = stdout
    }

    // Format response
    const formattedResponse = formatResponse(responseData, model, `bridge-${Date.now()}`)

    if (stream) {
      // For streaming, we'll simulate it by chunking the response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })

      const content = formattedResponse.choices[0].message.content
      const chunks = content.split(' ')

      for (let i = 0; i < chunks.length; i++) {
        const chunk = {
          id: formattedResponse.id,
          object: 'chat.completion.chunk',
          created: formattedResponse.created,
          model: formattedResponse.model,
          choices: [{
            index: 0,
            delta: i === 0
              ? { role: 'assistant', content: chunks[i] + ' ' }
              : { content: chunks[i] + ' ' },
            finish_reason: i === chunks.length - 1 ? 'stop' : null
          }]
        }

        res.write(`data: ${JSON.stringify(chunk)}\n\n`)

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      // Non-streaming response
      res.json(formattedResponse)
    }

  } catch (error) {
    console.error('[Bridge] Error:', error)

    if (error.code === 'ENOENT') {
      return res.status(500).json({
        error: 'Claude CLI binary not found or not executable'
      })
    }

    if (error.signal === 'SIGTERM' || error.killed) {
      return res.status(500).json({
        error: 'Claude CLI request timed out'
      })
    }

    res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
})

// Error handler
app.use((error, req, res, next) => {
  console.error('[Bridge] Unhandled error:', error)
  res.status(500).json({
    error: 'Internal server error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🌉 Claude CLI Bridge Service`)
  console.log(`📡 Running on: http://localhost:${PORT}`)
  console.log(`🔑 API Key: ${API_KEY}`)
  console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`)
  console.log(`🤖 Claude CLI: ${findClaudeCli() || 'NOT FOUND'}`)
  console.log(`\n📋 Configuration for Polydev:`)
  console.log(`   Bridge URL: http://localhost:${PORT}`)
  console.log(`   API Key: ${API_KEY}`)
  console.log(`\n💡 Make this accessible remotely with:`)
  console.log(`   ngrok http ${PORT}`)
  console.log(`   # or`)
  console.log(`   cloudflared tunnel --url localhost:${PORT}`)
  console.log(`\n🛑 Stop with: Ctrl+C`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Claude CLI Bridge Service...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down Claude CLI Bridge Service...')
  process.exit(0)
})