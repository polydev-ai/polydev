const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yzowvgajdyomscohebgm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6b3d2Z2FqZHlvbXNjb2hlYmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk0MzgzNywiZXhwIjoyMDUyNTE5ODM3fQ.iQtCHsxHvFIahtgtLrCLLTGm01CcGpXNyMQnQj7BQOg'

const supabase = createClient(supabaseUrl, supabaseKey)

const providers = [
  {
    provider_name: 'anthropic',
    display_name: 'Anthropic',
    models: [
      // Claude 4 Series
      {"id": "claude-sonnet-4-20250514:1m", "name": "Claude 4 Sonnet (1M)", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 3.0, "outputPrice": 15.0, "cacheWritePrice": 3.75, "cacheReadPrice": 0.3},
      {"id": "claude-sonnet-4-20250514", "name": "Claude 4 Sonnet", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 3.0, "outputPrice": 15.0, "cacheWritePrice": 3.75, "cacheReadPrice": 0.3},
      {"id": "claude-haiku-4-20250514", "name": "Claude 4 Haiku", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 0.25, "outputPrice": 1.25, "cacheWritePrice": 0.3125, "cacheReadPrice": 0.025},
      {"id": "claude-opus-4-1-20250805", "name": "Claude Opus 4.1", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 75.0, "cacheWritePrice": 18.75, "cacheReadPrice": 1.5},
      {"id": "claude-opus-4-20250514", "name": "Claude 4 Opus", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 75.0, "cacheWritePrice": 18.75, "cacheReadPrice": 1.5},
      
      // Claude 3.7 Series
      {"id": "claude-3-7-sonnet-20250219", "name": "Claude 3.7 Sonnet", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 3.0, "outputPrice": 15.0, "cacheWritePrice": 3.75, "cacheReadPrice": 0.3},
      
      // Claude 3.5 Series
      {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet (New)", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 3.0, "outputPrice": 15.0, "cacheWritePrice": 3.75, "cacheReadPrice": 0.3},
      {"id": "claude-3-5-sonnet-20240620", "name": "Claude 3.5 Sonnet", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 3.0, "outputPrice": 15.0, "cacheWritePrice": 3.75, "cacheReadPrice": 0.3},
      {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 0.8, "outputPrice": 4.0, "cacheWritePrice": 1.0, "cacheReadPrice": 0.08},
      
      // Claude 3 Series
      {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "maxTokens": 4096, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 75.0, "cacheWritePrice": 18.75, "cacheReadPrice": 1.5},
      {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "maxTokens": 4096, "contextWindow": 200000, "inputPrice": 3.0, "outputPrice": 15.0, "cacheWritePrice": 3.75, "cacheReadPrice": 0.3},
      {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "maxTokens": 4096, "contextWindow": 200000, "inputPrice": 0.25, "outputPrice": 1.25, "cacheWritePrice": 0.3125, "cacheReadPrice": 0.025}
    ]
  },
  {
    provider_name: 'openai-native',
    display_name: 'OpenAI (Native)',
    models: [
      // GPT-5 Series
      {"id": "gpt-5-2025-08-07", "name": "GPT-5 (Aug 2025)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 1.25, "outputPrice": 10.0, "cacheReadPrice": 0.125},
      {"id": "gpt-5-mini-2025-08-07", "name": "GPT-5 Mini (Aug 2025)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 0.15, "outputPrice": 0.6, "cacheReadPrice": 0.015},
      {"id": "gpt-5-nano-2025-08-07", "name": "GPT-5 Nano (Aug 2025)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheReadPrice": 0.0075},
      {"id": "gpt-5-chat-latest", "name": "GPT-5 Chat (Latest)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 1.25, "outputPrice": 10.0, "cacheReadPrice": 0.125},
      
      // GPT-4.1 Series
      {"id": "gpt-4.1", "name": "GPT-4.1", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 7.5, "outputPrice": 30.0, "cacheReadPrice": 0.75},
      {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 0.15, "outputPrice": 0.6, "cacheReadPrice": 0.015},
      {"id": "gpt-4.1-nano", "name": "GPT-4.1 Nano", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheReadPrice": 0.0075},
      
      // o3 and o4 Series
      {"id": "o3", "name": "o3", "maxTokens": 100000, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 60.0, "cacheReadPrice": 1.5},
      {"id": "o3-mini", "name": "o3 Mini", "maxTokens": 65536, "contextWindow": 128000, "inputPrice": 3.0, "outputPrice": 12.0, "cacheReadPrice": 0.3},
      {"id": "o4-mini", "name": "o4 Mini", "maxTokens": 65536, "contextWindow": 128000, "inputPrice": 1.0, "outputPrice": 4.0, "cacheReadPrice": 0.1},
      
      // o1 Series
      {"id": "o1", "name": "o1", "maxTokens": 100000, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 60.0, "cacheReadPrice": 1.5},
      {"id": "o1-preview", "name": "o1-preview", "maxTokens": 32768, "contextWindow": 128000, "inputPrice": 15.0, "outputPrice": 60.0, "cacheReadPrice": 1.5},
      {"id": "o1-mini", "name": "o1-mini", "maxTokens": 65536, "contextWindow": 128000, "inputPrice": 3.0, "outputPrice": 12.0, "cacheReadPrice": 0.3},
      
      // GPT-4o Series
      {"id": "gpt-4o", "name": "GPT-4o", "maxTokens": 16384, "contextWindow": 128000, "inputPrice": 2.5, "outputPrice": 10.0, "cacheReadPrice": 0.25},
      {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "maxTokens": 16384, "contextWindow": 128000, "inputPrice": 0.15, "outputPrice": 0.6, "cacheReadPrice": 0.015}
    ]
  },
  {
    provider_name: 'openai',
    display_name: 'OpenAI (API)',
    models: [
      // GPT-5 Series
      {"id": "gpt-5-2025-08-07", "name": "GPT-5 (Aug 2025)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 1.25, "outputPrice": 10.0, "cacheReadPrice": 0.125},
      {"id": "gpt-5-mini-2025-08-07", "name": "GPT-5 Mini (Aug 2025)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 0.15, "outputPrice": 0.6, "cacheReadPrice": 0.015},
      {"id": "gpt-5-nano-2025-08-07", "name": "GPT-5 Nano (Aug 2025)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheReadPrice": 0.0075},
      {"id": "gpt-5-chat-latest", "name": "GPT-5 Chat (Latest)", "maxTokens": 8192, "contextWindow": 272000, "inputPrice": 1.25, "outputPrice": 10.0, "cacheReadPrice": 0.125},
      
      // GPT-4.1 Series
      {"id": "gpt-4.1", "name": "GPT-4.1", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 7.5, "outputPrice": 30.0, "cacheReadPrice": 0.75},
      {"id": "gpt-4.1-mini", "name": "GPT-4.1 Mini", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 0.15, "outputPrice": 0.6, "cacheReadPrice": 0.015},
      {"id": "gpt-4.1-nano", "name": "GPT-4.1 Nano", "maxTokens": 8192, "contextWindow": 200000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheReadPrice": 0.0075},
      
      // o3 and o4 Series  
      {"id": "o3", "name": "o3", "maxTokens": 100000, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 60.0, "cacheReadPrice": 1.5},
      {"id": "o3-mini", "name": "o3 Mini", "maxTokens": 65536, "contextWindow": 128000, "inputPrice": 3.0, "outputPrice": 12.0, "cacheReadPrice": 0.3},
      {"id": "o4-mini", "name": "o4 Mini", "maxTokens": 65536, "contextWindow": 128000, "inputPrice": 1.0, "outputPrice": 4.0, "cacheReadPrice": 0.1},
      
      // o1 Series
      {"id": "o1", "name": "o1", "maxTokens": 100000, "contextWindow": 200000, "inputPrice": 15.0, "outputPrice": 60.0, "cacheReadPrice": 1.5},
      {"id": "o1-preview", "name": "o1-preview", "maxTokens": 32768, "contextWindow": 128000, "inputPrice": 15.0, "outputPrice": 60.0, "cacheReadPrice": 1.5},
      {"id": "o1-mini", "name": "o1-mini", "maxTokens": 65536, "contextWindow": 128000, "inputPrice": 3.0, "outputPrice": 12.0, "cacheReadPrice": 0.3},
      
      // GPT-4o Series
      {"id": "gpt-4o", "name": "GPT-4o", "maxTokens": 16384, "contextWindow": 128000, "inputPrice": 2.5, "outputPrice": 10.0, "cacheReadPrice": 0.25},
      {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "maxTokens": 16384, "contextWindow": 128000, "inputPrice": 0.15, "outputPrice": 0.6, "cacheReadPrice": 0.015}
    ]
  },
  {
    provider_name: 'gemini',
    display_name: 'Google Gemini',
    models: [
      // Gemini 2.0 Series
      {"id": "gemini-2.0-flash-exp", "name": "Gemini 2.0 Flash Experimental", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.0, "outputPrice": 0.0},
      {"id": "gemini-2.0-flash-thinking-exp-01-21", "name": "Gemini 2.0 Flash Thinking Experimental", "maxTokens": 32768, "contextWindow": 32768, "inputPrice": 0.0, "outputPrice": 0.0},
      
      // Gemini 1.5 Series
      {"id": "gemini-1.5-pro-latest", "name": "Gemini 1.5 Pro (Latest)", "maxTokens": 8192, "contextWindow": 2097152, "inputPrice": 1.25, "outputPrice": 2.5, "cacheWritePrice": 1.25, "cacheReadPrice": 0.0625},
      {"id": "gemini-1.5-pro-002", "name": "Gemini 1.5 Pro 002", "maxTokens": 8192, "contextWindow": 2097152, "inputPrice": 1.25, "outputPrice": 2.5, "cacheWritePrice": 1.25, "cacheReadPrice": 0.0625},
      {"id": "gemini-1.5-pro-001", "name": "Gemini 1.5 Pro 001", "maxTokens": 8192, "contextWindow": 1048576, "inputPrice": 3.5, "outputPrice": 10.5, "cacheWritePrice": 4.375, "cacheReadPrice": 0.21875},
      {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "maxTokens": 8192, "contextWindow": 2097152, "inputPrice": 1.25, "outputPrice": 2.5, "cacheWritePrice": 1.25, "cacheReadPrice": 0.0625},
      {"id": "gemini-1.5-flash-latest", "name": "Gemini 1.5 Flash (Latest)", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheWritePrice": 0.09375, "cacheReadPrice": 0.004687},
      {"id": "gemini-1.5-flash-002", "name": "Gemini 1.5 Flash 002", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheWritePrice": 0.09375, "cacheReadPrice": 0.004687},
      {"id": "gemini-1.5-flash-001", "name": "Gemini 1.5 Flash 001", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheWritePrice": 0.09375, "cacheReadPrice": 0.004687},
      {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.075, "outputPrice": 0.3, "cacheWritePrice": 0.09375, "cacheReadPrice": 0.004687},
      {"id": "gemini-1.5-flash-8b-latest", "name": "Gemini 1.5 Flash 8B (Latest)", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.0375, "outputPrice": 0.15, "cacheWritePrice": 0.046875, "cacheReadPrice": 0.0023438},
      {"id": "gemini-1.5-flash-8b", "name": "Gemini 1.5 Flash 8B", "maxTokens": 8192, "contextWindow": 1000000, "inputPrice": 0.0375, "outputPrice": 0.15, "cacheWritePrice": 0.046875, "cacheReadPrice": 0.0023438}
    ]
  },
  {
    provider_name: 'deepseek',
    display_name: 'DeepSeek',
    models: [
      {"id": "deepseek-chat", "name": "DeepSeek Chat", "maxTokens": 4096, "contextWindow": 32768, "inputPrice": 0.14, "outputPrice": 0.28},
      {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner", "maxTokens": 8192, "contextWindow": 64000, "inputPrice": 0.55, "outputPrice": 2.19}
    ]
  },
  {
    provider_name: 'qwen-international',
    display_name: 'Qwen International',
    models: [
      {"id": "qwen-max", "name": "Qwen Max", "maxTokens": 8000, "contextWindow": 30720, "inputPrice": 20.0, "outputPrice": 60.0},
      {"id": "qwen-plus", "name": "Qwen Plus", "maxTokens": 8000, "contextWindow": 131072, "inputPrice": 4.0, "outputPrice": 12.0},
      {"id": "qwen-turbo", "name": "Qwen Turbo", "maxTokens": 8000, "contextWindow": 131072, "inputPrice": 0.3, "outputPrice": 0.6},
      {"id": "qwen2.5-72b-instruct", "name": "Qwen2.5 72B Instruct", "maxTokens": 8192, "contextWindow": 131072, "inputPrice": 0.35, "outputPrice": 1.4},
      {"id": "qwen2-72b-instruct", "name": "Qwen2 72B Instruct", "maxTokens": 4096, "contextWindow": 32768, "inputPrice": 0.56, "outputPrice": 1.69}
    ]
  },
  {
    provider_name: 'xai',
    display_name: 'xAI',
    base_url: 'https://api.x.ai/v1',
    models: [
      {"id": "grok-4", "name": "Grok 4", "maxTokens": 8192, "contextWindow": 262144, "inputPrice": 3.0, "outputPrice": 15.0},
      {"id": "grok-beta", "name": "Grok Beta", "maxTokens": 4096, "contextWindow": 131072, "inputPrice": 5.0, "outputPrice": 15.0},
      {"id": "grok-vision-beta", "name": "Grok Vision Beta", "maxTokens": 4096, "contextWindow": 8192, "inputPrice": 5.0, "outputPrice": 15.0},
      {"id": "grok-2-latest", "name": "Grok 2 Latest", "maxTokens": 4096, "contextWindow": 131072, "inputPrice": 2.0, "outputPrice": 10.0}
    ]
  },
  {
    provider_name: 'mistral',
    display_name: 'Mistral AI',
    models: [
      {"id": "mistral-large-latest", "name": "Mistral Large (Latest)", "maxTokens": 32768, "contextWindow": 128000, "inputPrice": 2.0, "outputPrice": 6.0},
      {"id": "mistral-large-2407", "name": "Mistral Large 2407", "maxTokens": 32768, "contextWindow": 128000, "inputPrice": 2.0, "outputPrice": 6.0},
      {"id": "mistral-medium-latest", "name": "Mistral Medium (Latest)", "maxTokens": 32768, "contextWindow": 32000, "inputPrice": 2.7, "outputPrice": 8.1},
      {"id": "mistral-small-latest", "name": "Mistral Small (Latest)", "maxTokens": 32768, "contextWindow": 32000, "inputPrice": 0.2, "outputPrice": 0.6},
      {"id": "open-mistral-nemo", "name": "Open Mistral Nemo", "maxTokens": 32768, "contextWindow": 128000, "inputPrice": 0.15, "outputPrice": 0.15},
      {"id": "open-mistral-7b", "name": "Open Mistral 7B", "maxTokens": 32768, "contextWindow": 32000, "inputPrice": 0.25, "outputPrice": 0.25}
    ]
  }
]

async function updateProviders() {
  try {
    console.log('Starting provider update...')
    
    // Clear existing providers
    const { error: deleteError } = await supabase
      .from('provider_configurations')
      .delete()
      .neq('id', 0)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return
    }

    console.log('Cleared existing providers')

    // Insert all providers
    for (const provider of providers) {
      console.log(`Inserting ${provider.provider_name} with ${provider.models.length} models...`)
      
      const { error } = await supabase
        .from('provider_configurations')
        .insert([provider])
      
      if (error) {
        console.error(`Error inserting ${provider.provider_name}:`, error)
      } else {
        console.log(`✓ Successfully inserted ${provider.provider_name}`)
      }
    }

    console.log('\n✅ Successfully updated all providers with comprehensive model data!')
    console.log(`Total providers: ${providers.length}`)
    console.log(`Total models: ${providers.reduce((sum, p) => sum + p.models.length, 0)}`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

updateProviders()