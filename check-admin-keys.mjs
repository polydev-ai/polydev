import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxhutuxkthdxvciytwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c'
);

async function main() {
  // Check admin keys
  console.log('=== ADMIN KEYS ===');
  const { data: adminKeys, error: adminError } = await supabase
    .from('user_api_keys')
    .select('id, provider, key_name, key_preview, is_admin_key, active')
    .eq('is_admin_key', true);

  if (adminError) {
    console.error('Admin keys error:', adminError);
  } else {
    console.table(adminKeys);
  }

  // Check model_tiers
  console.log('\n=== MODEL TIERS (Credits) ===');
  const { data: tiers, error: tierError } = await supabase
    .from('model_tiers')
    .select('model_name, provider, tier, active')
    .eq('active', true)
    .in('tier', ['normal', 'eco', 'premium'])
    .order('display_order');

  if (tierError) {
    console.error('Tiers error:', tierError);
  } else {
    console.table(tiers);
  }

  // Check provider name match
  console.log('\n=== PROVIDER NAME COMPARISON ===');
  const adminProviders = adminKeys?.map(k => k.provider) || [];
  const tierProviders = [...new Set(tiers?.map(t => t.provider) || [])];

  console.log('Admin key providers:', adminProviders);
  console.log('Model tier providers:', tierProviders);

  // Find mismatches
  const missingInAdmin = tierProviders.filter(p => adminProviders.indexOf(p) === -1);
  if (missingInAdmin.length > 0) {
    console.log('\n⚠️ Providers in model_tiers but NOT in admin keys:', missingInAdmin);
  }
}

main().catch(console.error);
