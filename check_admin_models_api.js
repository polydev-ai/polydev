require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAdminModelsAPI() {
  // Check what the API endpoint returns
  const { data: adminKeys } = await supabase
    .from('user_api_keys')
    .select('id, provider, key_name, active')
    .eq('is_admin_key', true)
    .eq('active', true)

  console.log('=== ADMIN KEYS ===')
  console.log(JSON.stringify(adminKeys, null, 2))

  // Check what models_registry has for each provider
  const providers = ['anthropic', 'google', 'openai', 'x-ai', 'cerebras', 'zai-coding-plan']

  console.log('\n=== MODELS IN REGISTRY BY PROVIDER (WITH is_active) ===')
  for (const provider of providers) {
    const { data: activeModels } = await supabase
      .from('models_registry')
      .select('friendly_id, display_name, tier, is_active')
      .eq('provider_id', provider)
      .eq('is_active', true)
      .limit(10)

    const { data: allModels } = await supabase
      .from('models_registry')
      .select('friendly_id, display_name, tier, is_active')
      .eq('provider_id', provider)
      .limit(10)

    console.log(`\n${provider}:`)
    console.log(`  Active models: ${activeModels?.length || 0}`)
    console.log(`  All models: ${allModels?.length || 0}`)
    if (allModels && allModels.length > 0) {
      console.log('  Sample:')
      allModels.slice(0, 5).forEach(m => {
        console.log(`    - ${m.friendly_id} (${m.display_name}) [${m.tier}] active=${m.is_active}`)
      })
    }
  }
}

checkAdminModelsAPI().then(() => process.exit(0))
