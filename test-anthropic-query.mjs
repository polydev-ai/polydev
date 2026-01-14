import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxhutuxkthdxvciytwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c'
);

async function main() {
  // Simulate the exact query the code does
  const providerName = 'anthropic';  // From model_tiers after our fix

  console.log(`Looking for admin key with provider = '${providerName.toLowerCase()}'`);

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key, api_base, provider')
    .eq('provider', providerName.toLowerCase())
    .eq('is_admin_key', true)
    .eq('active', true)
    .single();

  if (error) {
    console.log('Query error:', error.message);
  } else if (data) {
    console.log('Found admin key:');
    console.log('  provider:', data.provider);
    console.log('  has encrypted_key:', !!data.encrypted_key);
    console.log('  key length:', data.encrypted_key?.length || 0);
    console.log('  api_base:', data.api_base);

    // Try to decode the key
    if (data.encrypted_key) {
      try {
        const decoded = Buffer.from(data.encrypted_key, 'base64').toString('utf-8');
        console.log('  decoded key preview:', decoded.substring(0, 15) + '...');
      } catch (e) {
        console.log('  decode error:', e.message);
      }
    }
  } else {
    console.log('No admin key found');
  }
}

main().catch(console.error);
