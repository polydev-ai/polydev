// Manual seed script for models.dev data
// Run with: node scripts/seed-models-dev.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedModelsDevData() {
  console.log('Starting models.dev data seed...')
  
  try {
    // Clean existing data to avoid constraint violations
    console.log('Cleaning existing model mappings...')
    const { error: mappingsDeleteError } = await supabase
      .from('model_mappings')
      .delete()
      .neq('friendly_id', 'KEEP_ALL') // Delete all records
    
    if (mappingsDeleteError) {
      console.warn('Warning cleaning mappings:', mappingsDeleteError)
    }

    console.log('Cleaning existing models...')
    const { error: modelsDeleteError } = await supabase
      .from('models_registry')
      .delete()
      .neq('id', 'KEEP_ALL') // Delete all records
    
    if (modelsDeleteError) {
      console.warn('Warning cleaning models:', modelsDeleteError)
    }

    console.log('Cleaning existing providers...')
    const { error: providersDeleteError } = await supabase
      .from('providers_registry')
      .delete()
      .neq('id', 'KEEP_ALL') // Delete all records
    
    if (providersDeleteError) {
      console.warn('Warning cleaning providers:', providersDeleteError)
    }
    // Fetch data from models.dev
    console.log('Fetching data from models.dev API...')
    const response = await fetch('https://models.dev/api.json')
    if (!response.ok) {
      throw new Error(`models.dev API error: ${response.status}`)
    }

    const rawData = await response.json()
    console.log(`Received ${Object.keys(rawData).length} providers from models.dev`)

    // Process and transform data
    const providerMap = new Map()
    const models = []
    const mappings = new Map()
    const seenModelIds = new Set()

    // Iterate through providers
    Object.entries(rawData).forEach(([providerId, providerData]) => {
      // Create provider entry
      const providerNames = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'deepseek': 'DeepSeek',
        'x-ai': 'xAI',
        'mistralai': 'Mistral AI',
        'meta': 'Meta',
        'cohere': 'Cohere',
        'perplexity': 'Perplexity',
        'together-ai': 'Together AI'
      }

      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          id: providerId,
          name: providerData.name || providerNames[providerId] || providerId,
          display_name: providerData.name || providerNames[providerId] || providerId,
          company: providerData.name || providerNames[providerId] || providerId,
          website: providerData.doc || `https://${providerId}.com`,
          logo_url: `https://models.dev/logos/${providerId}.svg`,
          description: `AI models from ${providerData.name || providerNames[providerId] || providerId}`,
          base_url: getProviderBaseUrl(providerId),
          authentication_method: getProviderAuthMethod(providerId),
          supports_streaming: true,
          supports_tools: true,
          supports_images: false,
          supports_prompt_cache: false,
          is_active: true,
          models_dev_data: { 
            last_sync: new Date().toISOString(),
            original_data: {
              id: providerData.id,
              name: providerData.name,
              doc: providerData.doc,
              env: providerData.env,
              npm: providerData.npm
            }
          }
        })
      }

      // Process models for this provider
      if (providerData.models) {
        Object.entries(providerData.models).forEach(([modelId, model]) => {
          const friendlyId = modelId
            .replace(/^[^\/]+\//, '')
            .replace(/-\d{8}$/, '')
            .replace(/-v\d+(\.\d+)*$/, '')

          // Skip duplicates using composite key (provider + model)
          const compositeKey = `${providerId}:${model.id}`
          if (seenModelIds.has(compositeKey)) {
            console.warn(`Skipping duplicate model ID: ${model.id} for provider: ${providerId}`)
            return
          }
          seenModelIds.add(compositeKey)

          // Create model entry with composite primary key
          const modelEntry = {
            id: `${providerId}/${model.id}`,
            provider_id: providerId,
            name: model.name,
            display_name: model.name,
            friendly_id: friendlyId,
            provider_model_id: model.id,
            max_tokens: model.limit?.output || 4096,
            context_length: model.limit?.context || 32768,
            input_cost_per_million: model.cost?.input || 0, // Already in per million format
            output_cost_per_million: model.cost?.output || 0,
            cache_read_cost_per_million: model.cost?.cache_read || null,
            cache_write_cost_per_million: model.cost?.cache_write || null,
            supports_vision: model.attachment || false,
            supports_tools: model.tool_call || false,
            supports_streaming: true,
            supports_reasoning: model.reasoning || false,
            reasoning_levels: model.reasoning ? 5 : null,
            model_family: getModelFamily(model.name),
            model_version: getModelVersion(model.name),
            is_active: true,
            models_dev_metadata: {
              original_id: model.id,
              reasoning: model.reasoning || false,
              attachment: model.attachment || false,
              tool_call: model.tool_call || false,
              temperature: model.temperature || false,
              knowledge: model.knowledge,
              release_date: model.release_date,
              last_updated: model.last_updated,
              modalities: model.modalities,
              open_weights: model.open_weights || false,
              last_sync: new Date().toISOString()
            }
          }
          models.push(modelEntry)

          // Update provider capabilities based on models
          const provider = providerMap.get(providerId)
          if (provider) {
            provider.supports_images = provider.supports_images || model.attachment || false
            provider.supports_prompt_cache = provider.supports_prompt_cache || (model.cost?.cache_read != null)
          }

          // Create mapping
          if (!mappings.has(friendlyId)) {
            mappings.set(friendlyId, {
              friendly_id: friendlyId,
              display_name: model.name,
              model_family: getModelFamily(model.name),
              providers: {}
            })
          }

          const mapping = mappings.get(friendlyId)
          mapping.providers[providerId] = {
            api_model_id: model.id,
            cost: {
              input: (model.cost?.input || 0) * 1000,
              output: (model.cost?.output || 0) * 1000,
              cache_read: model.cost?.cache_read ? model.cost.cache_read * 1000 : null,
              cache_write: model.cost?.cache_write ? model.cost.cache_write * 1000 : null
            },
            capabilities: {
              vision: model.attachment || false,
              tools: model.tool_call || false,
              streaming: true,
              reasoning_levels: model.reasoning ? 5 : undefined,
              temperature: model.temperature || false
            }
          }
        })
      }
    })

    // Insert providers
    console.log(`Inserting ${providerMap.size} providers...`)
    const providers = Array.from(providerMap.values())
    const { error: providersError } = await supabase
      .from('providers_registry')
      .insert(providers)

    if (providersError) {
      console.error('Error inserting providers:', providersError)
      throw providersError
    }

    // Insert models in batches
    console.log(`Inserting ${models.length} models...`)
    const batchSize = 100
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize)
      const { error: modelsError } = await supabase
        .from('models_registry')
        .insert(batch)

      if (modelsError) {
        console.error(`Error inserting models batch ${i}:`, modelsError)
        throw modelsError
      }
    }

    // Insert mappings
    console.log(`Inserting ${mappings.size} model mappings...`)
    const mappingEntries = Array.from(mappings.values()).map(mapping => ({
      friendly_id: mapping.friendly_id,
      display_name: mapping.display_name,
      model_family: mapping.model_family,
      providers_mapping: mapping.providers
    }))

    const { error: mappingsError } = await supabase
      .from('model_mappings')
      .insert(mappingEntries)

    if (mappingsError) {
      console.error('Error inserting mappings:', mappingsError)
      throw mappingsError
    }

    // Log sync completion
    const { error: logError } = await supabase
      .from('models_dev_sync_log')
      .insert({
        sync_type: 'full',
        status: 'completed',
        providers_synced: providers.length,
        models_synced: models.length,
        sync_duration_ms: Date.now() - Date.now(),
        models_dev_response_size: JSON.stringify(rawData).length
      })

    if (logError) {
      console.warn('Error logging sync:', logError)
    }

    console.log('✅ models.dev data seeded successfully!')
    console.log(`- ${providers.length} providers`)
    console.log(`- ${models.length} models`) 
    console.log(`- ${mappingEntries.length} mappings`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

function getProviderBaseUrl(providerId) {
  const baseUrlMap = {
    // Official provider APIs
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com/v1',
    'google': 'https://generativelanguage.googleapis.com/v1',
    'google-vertex': 'https://{LOCATION}-aiplatform.googleapis.com/v1',
    'deepseek': 'https://api.deepseek.com/v1',
    'mistral': 'https://api.mistral.ai/v1',
    'groq': 'https://api.groq.com/openai/v1',
    'cohere': 'https://api.cohere.ai/v1',
    'perplexity': 'https://api.perplexity.ai',
    'xai': 'https://api.x.ai/v1',
    'together-ai': 'https://api.together.xyz/v1',
    'togetherai': 'https://api.together.xyz/v1',
    'fireworks-ai': 'https://api.fireworks.ai/inference/v1',
    'cerebras': 'https://api.cerebras.ai/v1',
    'deepinfra': 'https://api.deepinfra.com/v1/openai',
    'huggingface': 'https://api-inference.huggingface.co/models',
    'nvidia': 'https://integrate.api.nvidia.com/v1',
    'azure': 'https://{RESOURCE_NAME}.openai.azure.com/openai/deployments',
    'amazon-bedrock': 'https://bedrock-runtime.{REGION}.amazonaws.com',
    'cloudflare-workers-ai': 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run',
    'moonshotai': 'https://api.moonshot.cn/v1',
    'moonshotai-cn': 'https://api.moonshot.cn/v1',
    'upstage': 'https://api.upstage.ai/v1/solar',
    'baseten': 'https://model-{MODEL_ID}.api.baseten.co/production/predict',
    'lmstudio': 'http://localhost:1234/v1',
    'v0': 'https://api.vercel.com/v1',
    'vercel': 'https://api.vercel.com/v1',
    'venice': 'https://api.venice.ai/api/v1',
    'synthetic': 'https://api.synthetic.new/v1',
    'requesty': 'https://api.requesty.ai/v1',
    'fastrouter': 'https://api.fastrouter.ai/v1',
    'chutes': 'https://llm.chutes.ai/v1',
    'submodel': 'https://api.submodel.ai/v1',
    'morph': 'https://api.morphllm.com/v1',
    'inference': 'https://inference.net/v1',
    'inception': 'https://platform.inceptionlabs.ai/v1',
    'opencode': 'https://api.opencode.ai/v1',
    'alibaba': 'https://dashscope.aliyuncs.com/api/v1',
    'modelscope': 'https://modelscope.cn/api/v1/models',
    'github-copilot': 'https://api.githubcopilot.com/chat/completions',
    'github-models': 'https://models.inference.ai.azure.com',
    'llama': 'https://api.llama-api.com/chat/completions',
    // Aggregator/routing services (fallback to OpenRouter for compatibility)
    'openrouter': 'https://openrouter.ai/api/v1'
  }
  
  return baseUrlMap[providerId] || 'https://openrouter.ai/api/v1'
}

function getModelFamily(name) {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('gpt')) return 'GPT'
  if (lowerName.includes('claude')) return 'Claude'
  if (lowerName.includes('gemini')) return 'Gemini'
  if (lowerName.includes('deepseek')) return 'DeepSeek'
  if (lowerName.includes('grok')) return 'Grok'
  if (lowerName.includes('mistral')) return 'Mistral'
  if (lowerName.includes('llama')) return 'Llama'
  if (lowerName.includes('qwen')) return 'Qwen'
  return 'Other'
}

function getModelVersion(name) {
  const versionMatch = name.match(/v?(\d+(?:\.\d+)*)/i)
  return versionMatch ? versionMatch[1] : '1.0'
}

function getProviderAuthMethod(providerId) {
  const authMethodMap = {
    // OAuth/complex authentication providers
    'google': 'oauth2',
    'google-vertex': 'service_account',
    'amazon-bedrock': 'aws_iam',
    'azure': 'azure_ad',
    'github-models': 'github_token',
    'github-copilot': 'github_token',
    'cloudflare-workers-ai': 'cloudflare_api_token',
    'huggingface': 'hf_token',
    'alibaba': 'aliyun_access_key',
    'baseten': 'baseten_api_key',
    'lmstudio': 'none', // Local server, no auth needed
    
    // API key providers (most common)
    'openai': 'api_key',
    'anthropic': 'api_key',
    'deepseek': 'api_key',
    'mistral': 'api_key',
    'groq': 'api_key',
    'cohere': 'api_key',
    'perplexity': 'api_key',
    'xai': 'api_key',
    'together-ai': 'api_key',
    'togetherai': 'api_key',
    'fireworks-ai': 'api_key',
    'cerebras': 'api_key',
    'deepinfra': 'api_key',
    'nvidia': 'api_key',
    'moonshotai': 'api_key',
    'moonshotai-cn': 'api_key',
    'upstage': 'api_key',
    'v0': 'vercel_token',
    'vercel': 'vercel_token',
    'venice': 'api_key',
    'synthetic': 'api_key',
    'requesty': 'api_key',
    'fastrouter': 'api_key',
    'chutes': 'api_key',
    'submodel': 'api_key',
    'morph': 'api_key',
    'inference': 'api_key',
    'inception': 'api_key',
    'opencode': 'api_key',
    'modelscope': 'api_key',
    'llama': 'api_key',
    'openrouter': 'api_key'
  }
  
  return authMethodMap[providerId] || 'api_key'
}

seedModelsDevData()