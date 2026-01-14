import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxhutuxkthdxvciytwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c'
);

async function main() {
  // Test .ilike() with 'Google' to match 'google'
  console.log('Testing .ilike() with "Google" to find "google"...');

  const { data: exactMatch, error: exactError } = await supabase
    .from('user_api_keys')
    .select('provider, key_name, is_admin_key, active')
    .eq('provider', 'Google')
    .eq('is_admin_key', true)
    .eq('active', true);

  console.log('.eq("provider", "Google"):', exactMatch || exactError);

  const { data: ilikeMatch, error: ilikeError } = await supabase
    .from('user_api_keys')
    .select('provider, key_name, is_admin_key, active')
    .ilike('provider', 'Google')
    .eq('is_admin_key', true)
    .eq('active', true);

  console.log('.ilike("provider", "Google"):', ilikeMatch || ilikeError);

  const { data: lowerMatch, error: lowerError } = await supabase
    .from('user_api_keys')
    .select('provider, key_name, is_admin_key, active')
    .eq('provider', 'google')
    .eq('is_admin_key', true)
    .eq('active', true);

  console.log('.eq("provider", "google"):', lowerMatch || lowerError);
}

main().catch(console.error);
