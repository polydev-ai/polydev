require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkXaiUnknown() {
  // Check user_preferences
  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('*')

  console.log('=== USER PREFERENCES ===')
  console.log(JSON.stringify(prefs, null, 2))
  if (prefsError) console.log('Error:', prefsError)

  // Check models_registry for xai models
  const { data: xaiModels } = await supabase
    .from('models_registry')
    .select('id, friendly_id, display_name, provider_id')
    .eq('provider_id', 'x-ai')

  console.log('\n=== X-AI MODELS IN REGISTRY ===')
  console.log(JSON.stringify(xaiModels, null, 2))

  // Check for x-ai-unknown in any text column
  const { data: usage } = await supabase
    .from('perspective_usage')
    .select('model_name, provider, provider_source_id, request_metadata')
    .ilike('model_name', '%unknown%')
    .limit(10)

  console.log('\n=== USAGE WITH "unknown" IN MODEL NAME ===')
  console.log(JSON.stringify(usage, null, 2))

  // Check user API keys configured models
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('id, provider, key_name, default_model')
    .eq('provider', 'x-ai')

  console.log('\n=== USER X-AI API KEYS ===')
  console.log(JSON.stringify(userKeys, null, 2))
}

checkXaiUnknown().then(() => process.exit(0))
