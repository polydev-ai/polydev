/**
 * Provider Normalization Utilities
 *
 * Centralized utilities for normalizing provider names across the entire application.
 * This ensures consistent provider identification in database queries, API calls, and UI.
 */

/**
 * Provider name mappings for special cases where the database/display name
 * differs from the API handler or models.dev name.
 */
export const PROVIDER_NAME_MAPPINGS: Record<string, string> = {
  'xai': 'x-ai',
  'x.ai': 'x-ai',
  'togetherai': 'together',
  'google-vertex': 'google',
  'google-vertex-anthropic': 'google',
  'openai-native': 'openai',
  // Note: 'zai-coding-plan' is NOT normalized to 'zhipuai' here
  // because it's stored and used as 'zai-coding-plan' in our system.
  // Only the models.dev API requires 'zhipuai' for lookups.
} as const

/**
 * Normalizes a provider name to its canonical form used throughout the application.
 *
 * This function:
 * 1. Converts to lowercase for case-insensitive matching
 * 2. Applies special case mappings (e.g., xai → x-ai)
 * 3. Returns the normalized provider identifier
 *
 * @param provider - The provider name to normalize (can be any case)
 * @returns The normalized provider name in lowercase with mappings applied
 *
 * @example
 * normalizeProviderName('Anthropic') // returns 'anthropic'
 * normalizeProviderName('xAI') // returns 'x-ai'
 * normalizeProviderName('OpenAI') // returns 'openai'
 */
export function normalizeProviderName(provider: string): string {
  if (!provider) return ''

  const lowercased = provider.toLowerCase().trim()
  return PROVIDER_NAME_MAPPINGS[lowercased] || lowercased
}

/**
 * Normalizes an array of provider names.
 *
 * @param providers - Array of provider names to normalize
 * @returns Array of normalized provider names
 */
export function normalizeProviderNames(providers: string[]): string[] {
  return providers.map(normalizeProviderName)
}

/**
 * Checks if two provider names are equivalent after normalization.
 *
 * @param provider1 - First provider name
 * @param provider2 - Second provider name
 * @returns true if providers are equivalent after normalization
 *
 * @example
 * areProvidersEqual('xAI', 'x-ai') // returns true
 * areProvidersEqual('Anthropic', 'anthropic') // returns true
 * areProvidersEqual('OpenAI', 'Google') // returns false
 */
export function areProvidersEqual(provider1: string, provider2: string): boolean {
  return normalizeProviderName(provider1) === normalizeProviderName(provider2)
}

/**
 * Gets the normalized provider name from an object that has a provider field.
 * Useful for mapping over arrays of objects with provider information.
 *
 * @param obj - Object with a provider field
 * @returns Normalized provider name
 */
export function getNormalizedProvider<T extends { provider: string }>(obj: T): string {
  return normalizeProviderName(obj.provider)
}

/**
 * Creates a provider lookup map from an array of items with provider information.
 * The map keys are normalized provider names.
 *
 * @param items - Array of items with provider information
 * @param keyFn - Optional function to extract the provider name (defaults to obj.provider)
 * @returns Map with normalized provider names as keys
 */
export function createProviderMap<T>(
  items: T[],
  keyFn: (item: T) => string = (item: any) => item.provider
): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    const provider = keyFn(item)
    const normalized = normalizeProviderName(provider)
    map.set(normalized, item)
  }
  return map
}

/**
 * Filters an array of items to only include those matching the specified provider.
 *
 * @param items - Array of items with provider information
 * @param targetProvider - Provider name to filter by
 * @param keyFn - Optional function to extract the provider name
 * @returns Filtered array of items
 */
export function filterByProvider<T>(
  items: T[],
  targetProvider: string,
  keyFn: (item: T) => string = (item: any) => item.provider
): T[] {
  const normalizedTarget = normalizeProviderName(targetProvider)
  return items.filter(item => normalizeProviderName(keyFn(item)) === normalizedTarget)
}

/**
 * Normalizes a provider name specifically for the models.dev API.
 * This includes special mappings that are only needed for external API calls.
 *
 * @param provider - The provider name to normalize
 * @returns Provider name formatted for models.dev API
 *
 * @example
 * normalizeProviderForModelsDevAPI('zai-coding-plan') // returns 'zhipuai'
 * normalizeProviderForModelsDevAPI('xAI') // returns 'x-ai'
 */
export function normalizeProviderForModelsDevAPI(provider: string): string {
  // First apply standard normalization
  const normalized = normalizeProviderName(provider)

  // Then apply models.dev specific mappings
  const modelsDevMappings: Record<string, string> = {
    'zai-coding-plan': 'zhipuai',
  }

  return modelsDevMappings[normalized] || normalized
}
