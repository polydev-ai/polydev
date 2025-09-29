import { createClient } from '@/app/utils/supabase/server'

export interface MaxTokensConfig {
  maxOutputTokens: number
  source: 'user_custom' | 'user_tier' | 'model_specific' | 'provider_tier' | 'provider_default' | 'fallback'
}

/**
 * Determine model tier by querying the database
 */
export async function getModelTier(
  providerName: string,
  modelName: string
): Promise<'premium' | 'normal' | 'eco' | 'unknown'> {
  try {
    const supabase = await createClient()

    const { data: modelTier, error } = await supabase
      .from('model_tiers')
      .select('tier')
      .eq('provider', providerName)
      .eq('model_name', modelName)
      .single()

    if (error || !modelTier) {
      console.log(`Model tier not found for ${providerName}/${modelName}, returning unknown`)
      return 'unknown'
    }

    return modelTier.tier as 'premium' | 'normal' | 'eco'
  } catch (error) {
    console.error('Error fetching model tier:', error)
    return 'unknown'
  }
}

/**
 * Get max output tokens for a model, considering:
 * 1. Admin global max (absolute ceiling)
 * 2. User custom setting (capped by admin global max)
 * 3. User tier-specific setting (capped by admin global max)
 * 4. Model-specific setting (from model_tiers table)
 * 5. Provider tier-specific setting
 * 6. Provider default setting
 * 7. Tier-based default (16000/8000/4000)
 */
export async function getMaxOutputTokens(
  userId: string,
  providerName: string,
  modelName: string
): Promise<MaxTokensConfig> {
  const supabase = await createClient()
  const tier = await getModelTier(providerName, modelName)

  try {
    // 0. Get admin global max tokens (absolute ceiling)
    const { data: adminConfig } = await supabase
      .from('admin_pricing_config')
      .select('config_value')
      .eq('config_key', 'global_max_output_tokens')
      .single()

    const adminGlobalMax = adminConfig?.config_value?.max_tokens || 32000

    // 1. Check user preferences
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('max_output_tokens_custom, max_output_tokens_premium, max_output_tokens_normal, max_output_tokens_eco')
      .eq('user_id', userId)
      .single()

    // User custom setting (capped by admin global max)
    if (userPrefs?.max_output_tokens_custom) {
      return {
        maxOutputTokens: Math.min(userPrefs.max_output_tokens_custom, adminGlobalMax),
        source: 'user_custom'
      }
    }

    // User tier-specific setting (capped by admin global max)
    if (tier !== 'unknown') {
      const tierField = `max_output_tokens_${tier}`
      const userTierValue = userPrefs?.[tierField]
      if (userTierValue) {
        return {
          maxOutputTokens: Math.min(userTierValue, adminGlobalMax),
          source: 'user_tier'
        }
      }
    }

    // 2. Check model-specific setting (capped by admin global max)
    const { data: modelTier } = await supabase
      .from('model_tiers')
      .select('max_output_tokens')
      .eq('provider', providerName)
      .eq('model_name', modelName)
      .single()

    if (modelTier?.max_output_tokens) {
      return {
        maxOutputTokens: Math.min(modelTier.max_output_tokens, adminGlobalMax),
        source: 'model_specific'
      }
    }

    // 3. Check provider configuration (capped by admin global max)
    const { data: providerConfig } = await supabase
      .from('provider_configurations')
      .select('max_output_tokens_premium, max_output_tokens_normal, max_output_tokens_eco, max_output_tokens_default')
      .eq('provider_name', providerName)
      .single()

    // Provider tier-specific setting
    if (tier !== 'unknown' && providerConfig) {
      const tierField = `max_output_tokens_${tier}`
      const providerTierValue = providerConfig[tierField]
      if (providerTierValue) {
        return {
          maxOutputTokens: Math.min(providerTierValue, adminGlobalMax),
          source: 'provider_tier'
        }
      }
    }

    // Provider default setting
    if (providerConfig?.max_output_tokens_default) {
      return {
        maxOutputTokens: Math.min(providerConfig.max_output_tokens_default, adminGlobalMax),
        source: 'provider_default'
      }
    }

    // 4. Tier-based defaults (capped by admin global max)
    const fallbackTokens = {
      premium: 16000,
      normal: 8000,
      eco: 4000,
      unknown: 8000
    }

    return {
      maxOutputTokens: Math.min(fallbackTokens[tier], adminGlobalMax),
      source: 'fallback'
    }
  } catch (error) {
    console.error('Error fetching max tokens config:', error)
    // Emergency fallback
    return {
      maxOutputTokens: 8000,
      source: 'fallback'
    }
  }
}

/**
 * Sync version for when you already have the config data
 * Note: This cannot look up model tier from database, so tier must be provided or inferred from modelTier
 */
export function getMaxOutputTokensSync(
  userPrefs: any,
  providerConfig: any,
  modelTier: any,
  tier: 'premium' | 'normal' | 'eco' | 'unknown'
): MaxTokensConfig {
  // User custom setting
  if (userPrefs?.max_output_tokens_custom) {
    return {
      maxOutputTokens: userPrefs.max_output_tokens_custom,
      source: 'user_custom'
    }
  }

  // User tier setting
  if (tier !== 'unknown') {
    const tierField = `max_output_tokens_${tier}`
    const userTierValue = userPrefs?.[tierField]
    if (userTierValue) {
      return {
        maxOutputTokens: userTierValue,
        source: 'user_tier'
      }
    }
  }

  // Model-specific setting
  if (modelTier?.max_output_tokens) {
    return {
      maxOutputTokens: modelTier.max_output_tokens,
      source: 'model_specific'
    }
  }

  // Provider tier setting
  if (tier !== 'unknown' && providerConfig) {
    const tierField = `max_output_tokens_${tier}`
    const providerTierValue = providerConfig[tierField]
    if (providerTierValue) {
      return {
        maxOutputTokens: providerTierValue,
        source: 'provider_tier'
      }
    }
  }

  // Provider default
  if (providerConfig?.max_output_tokens_default) {
    return {
      maxOutputTokens: providerConfig.max_output_tokens_default,
      source: 'provider_default'
    }
  }

  // Fallback
  const fallbackTokens = {
    premium: 16000,
    normal: 8000,
    eco: 4000,
    unknown: 8000
  }

  return {
    maxOutputTokens: fallbackTokens[tier],
    source: 'fallback'
  }
}