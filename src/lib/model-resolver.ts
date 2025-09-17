import { modelsDevService } from '@/lib/models-dev-integration'

/**
 * Resolves a model ID to the correct provider-specific format
 * Handles both friendly IDs (e.g., "claude-sonnet-4") and provider-specific IDs (e.g., "anthropic/claude-3-5-sonnet")
 *
 * @param inputModelId - The model ID to resolve (can be friendly or provider-specific)
 * @param providerId - The target provider ID (e.g., "anthropic", "openai", "openrouter")
 * @returns The resolved provider-specific model ID, or the original ID if no mapping found
 */
export async function resolveProviderModelId(inputModelId: string, providerId: string): Promise<string> {
  try {
    // Step 1: Check if inputModelId is already a friendly ID by trying direct mapping
    const providerSpecificId = await modelsDevService.getProviderSpecificModelId(inputModelId, providerId)
    if (providerSpecificId) {
      console.log(`[Model Resolver] Resolved friendly ID ${inputModelId} for ${providerId} to: ${providerSpecificId}`)
      return providerSpecificId
    }

    // Step 2: inputModelId might be a provider-specific ID, try reverse mapping to friendly ID first
    console.log(`[Model Resolver] Direct mapping failed for ${inputModelId}, attempting reverse mapping...`)
    const friendlyId = await modelsDevService.getFriendlyIdFromProviderModelId(inputModelId, providerId)

    if (friendlyId) {
      console.log(`[Model Resolver] Found friendly ID ${friendlyId} for provider model ID ${inputModelId}`)
      // Now get the correct provider-specific ID for the target provider
      const resolvedProviderSpecificId = await modelsDevService.getProviderSpecificModelId(friendlyId, providerId)
      if (resolvedProviderSpecificId) {
        console.log(`[Model Resolver] Resolved ${friendlyId} for ${providerId} to: ${resolvedProviderSpecificId}`)
        return resolvedProviderSpecificId
      }
    }

    // Step 3: Try reverse mapping without provider constraint (broad search)
    console.log(`[Model Resolver] Provider-specific reverse mapping failed, trying broad reverse mapping...`)
    const broadFriendlyId = await modelsDevService.getFriendlyIdFromProviderModelId(inputModelId)
    if (broadFriendlyId) {
      console.log(`[Model Resolver] Found friendly ID ${broadFriendlyId} for model ID ${inputModelId} (broad search)`)
      const resolvedProviderSpecificId = await modelsDevService.getProviderSpecificModelId(broadFriendlyId, providerId)
      if (resolvedProviderSpecificId) {
        console.log(`[Model Resolver] Resolved ${broadFriendlyId} for ${providerId} to: ${resolvedProviderSpecificId}`)
        return resolvedProviderSpecificId
      }
    }

    // Fall back to the original model ID if no mapping found
    console.log(`[Model Resolver] No mapping found for ${inputModelId} with provider ${providerId}, using original ID`)
    return inputModelId
  } catch (error) {
    console.error(`[Model Resolver] Error resolving model ID ${inputModelId} for provider ${providerId}:`, error)
    return inputModelId
  }
}