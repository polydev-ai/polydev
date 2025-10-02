require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkModelTiers() {
  const { data: tiers } = await supabase
    .from('model_tiers')
    .select('*')
    .eq('active', true)

  console.log('=== ACTIVE MODEL TIERS ===')
  console.log(`Total: ${tiers?.length || 0}`)

  if (tiers && tiers.length > 0) {
    // Group by provider
    const byProvider = tiers.reduce((acc, t) => {
      if (!acc[t.provider]) acc[t.provider] = []
      acc[t.provider].push(t)
      return acc
    }, {})

    console.log('\nBy Provider:')
    Object.keys(byProvider).sort().forEach(provider => {
      console.log(`\n${provider}:`)
      byProvider[provider].forEach(t => {
        console.log(`  [${t.tier}] ${t.model_name} - ${t.display_name}`)
      })
    })
  }

  // Check specific providers
  const providers = ['anthropic', 'google', 'openai', 'x-ai', 'cerebras', 'zai-coding-plan']
  console.log('\n=== ADMIN KEY PROVIDERS STATUS ===')
  for (const provider of providers) {
    const count = tiers?.filter(t => t.provider.toLowerCase() === provider.toLowerCase()).length || 0
    console.log(`${provider}: ${count} tiers`)
  }
}

checkModelTiers().then(() => process.exit(0))
