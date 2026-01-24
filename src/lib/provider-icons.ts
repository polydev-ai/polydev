/**
 * Provider Icons and Display Information
 * Static mappings for AI provider display data
 */

// Provider icons mapping
export const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔍',
  deepseek: '🌊',
  'x-ai': '✖️',
  xai: '✖️',
  mistralai: '💨',
  mistral: '💨',
  'meta-llama': '🦙',
  meta: '🦙',
  qwen: '🏮',
  microsoft: '🪟',
  cohere: '🔗',
  nvidia: '💚',
  'ai21': '🤖',
  perplexity: '❓',
  amazon: '📦',
  baidu: '🐻',
  'z-ai': '⚡',
  zai: '⚡',
  zhipuai: '⚡',
  'zai-coding-plan': '⚡',
  bytedance: '🎵',
  liquid: '💧',
  'nousresearch': '🔬',
  'rekaai': '🎯',
  groq: '⚡',
  together: '🤝',
  fireworks: '🎆',
  replicate: '🔄'
}

// Get provider display info
export function getProviderInfo(providerId: string) {
  const icon = PROVIDER_ICONS[providerId.toLowerCase()] || '🤖'
  const name = providerId.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')

  return { icon, name, id: providerId }
}
