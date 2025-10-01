import { NextRequest } from 'next/server'

export type ClientSource = 'web' | 'claude-code' | 'codex' | 'cursor' | 'cline' | 'continue' | 'unknown'

/**
 * Detects the MCP client source from request headers
 * Checks multiple sources: custom headers, User-Agent, query params
 */
export function detectClientSource(request: NextRequest): ClientSource {
  // 1. Check custom header (X-Client-Source)
  const clientHeader = request.headers.get('x-client-source')?.toLowerCase()
  if (clientHeader) {
    switch (clientHeader) {
      case 'claude-code':
        return 'claude-code'
      case 'codex':
      case 'codex-cli':
        return 'codex'
      case 'cursor':
        return 'cursor'
      case 'cline':
        return 'cline'
      case 'continue':
        return 'continue'
      case 'web':
        return 'web'
    }
  }

  // 2. Check query parameter (fallback)
  const clientParam = request.nextUrl.searchParams.get('client_source')?.toLowerCase()
  if (clientParam) {
    switch (clientParam) {
      case 'claude-code':
        return 'claude-code'
      case 'codex':
      case 'codex-cli':
        return 'codex'
      case 'cursor':
        return 'cursor'
      case 'cline':
        return 'cline'
      case 'continue':
        return 'continue'
      case 'web':
        return 'web'
    }
  }

  // 3. Check User-Agent for known patterns
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''

  if (userAgent.includes('claude-code') || userAgent.includes('claude/code')) {
    return 'claude-code'
  }
  if (userAgent.includes('codex') || userAgent.includes('gemini-code')) {
    return 'codex'
  }
  if (userAgent.includes('cursor')) {
    return 'cursor'
  }
  if (userAgent.includes('cline')) {
    return 'cline'
  }
  if (userAgent.includes('continue')) {
    return 'continue'
  }

  // 4. Check Referer header for web requests
  const referer = request.headers.get('referer') || ''
  if (referer.includes('polydev.ai') || referer.includes('localhost')) {
    return 'web'
  }

  // 5. Check Origin header
  const origin = request.headers.get('origin') || ''
  if (origin.includes('polydev.ai') || origin.includes('localhost')) {
    return 'web'
  }

  return 'unknown'
}

/**
 * Gets the list of providers that should be excluded for a given client source
 * Claude Code excludes Anthropic, Codex excludes OpenAI
 */
export function getExcludedProviders(clientSource: ClientSource): string[] {
  switch (clientSource) {
    case 'claude-code':
      return ['anthropic']
    case 'codex':
      return ['openai']
    // Cursor, Cline, Continue, and others don't have specific exclusions
    default:
      return []
  }
}

/**
 * Gets a human-readable display name for a client source
 */
export function getClientDisplayName(clientSource: ClientSource): string {
  switch (clientSource) {
    case 'claude-code':
      return 'Claude Code'
    case 'codex':
      return 'Codex CLI'
    case 'cursor':
      return 'Cursor'
    case 'cline':
      return 'Cline'
    case 'continue':
      return 'Continue'
    case 'web':
      return 'Web Chat'
    case 'unknown':
      return 'Unknown Client'
  }
}
