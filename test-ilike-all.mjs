import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxhutuxkthdxvciytwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c'
);

async function main() {
  // Test providers from model_tiers
  const providers = ['Google', 'OpenAI', 'Anthropic', 'x-ai', 'Cerebras'];

  console.log('Testing admin key lookup for each provider from model_tiers:\n');

  for (const provider of providers) {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('provider, key_name, encrypted_key, is_admin_key, active')
      .ilike('provider', provider)
      .eq('is_admin_key', true)
      .eq('active', true)
      .single();

    if (error) {
      console.log(`${provider}: ERROR - ${error.message}`);
    } else if (data) {
      console.log(`${provider}: FOUND - ${data.key_name} (has_key: ${!!data.encrypted_key})`);
    } else {
      console.log(`${provider}: NOT FOUND`);
    }
  }
}

main().catch(console.error);
