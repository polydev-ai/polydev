require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixXaiUnknown() {
  const userId = '5abacdd1-6a9b-48ce-b723-ca8056324c7a'

  // Get current preferences
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('mcp_settings')
    .eq('user_id', userId)
    .single()

  console.log('Current saved_chat_models:', prefs.mcp_settings.saved_chat_models)

  // Remove x-ai-unknown and replace with valid model
  const updatedModels = prefs.mcp_settings.saved_chat_models
    .filter(m => m !== 'x-ai-unknown')

  // Add grok-3-mini if not already there
  if (!updatedModels.includes('grok-3-mini')) {
    updatedModels.push('grok-3-mini')
  }

  console.log('Updated saved_chat_models:', updatedModels)

  // Update database
  const { error } = await supabase
    .from('user_preferences')
    .update({
      mcp_settings: {
        ...prefs.mcp_settings,
        saved_chat_models: updatedModels
      }
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating:', error)
  } else {
    console.log('✅ Successfully removed x-ai-unknown and added grok-3-mini')
  }
}

fixXaiUnknown().then(() => process.exit(0))
