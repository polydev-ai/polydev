require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyFix() {
  console.log('Fixing model_tiers provider normalization...')

  // Update xAI to x-ai
  const { error: updateError } = await supabase
    .from('model_tiers')
    .update({ provider: 'x-ai' })
    .ilike('provider', 'xai')
    .eq('active', true)

  if (updateError) {
    console.error('Error updating model_tiers:', updateError)
  } else {
    console.log('✅ Updated xAI to x-ai in model_tiers')
  }

  // Verify the fix
  const { data: xaiTiers } = await supabase
    .from('model_tiers')
    .select('tier, model_name, display_name, provider')
    .eq('provider', 'x-ai')
    .eq('active', true)

  console.log('\nVerification - x-ai tiers:')
  console.log(JSON.stringify(xaiTiers, null, 2))
}

applyFix().then(() => process.exit(0))
