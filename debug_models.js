require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debug() {
  // Just get ANY models
  const { data: anyModels, error } = await supabase
    .from('models_registry')
    .select('id, friendly_id, provider_id, is_active')
    .limit(20)

  console.log('=== ANY MODELS ===')
  if (error) {
    console.log('Error:', error)
  }
  console.log(`Total: ${anyModels?.length || 0}`)
  console.log(JSON.stringify(anyModels, null, 2))
}

debug().then(() => process.exit(0))
