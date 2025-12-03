const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env file
const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n]+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\n]+)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function diagnose() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  MODELS DROPDOWN COMPREHENSIVE DIAGNOSTIC                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: What admin keys exist?
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Admin API Keys (user_api_keys WHERE is_admin_key=true)  │');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  const { data: adminKeys } = await supabase
    .from('user_api_keys')
    .select('provider, active')
    .eq('is_admin_key', true)
    .eq('active', true);

  console.log('Admin key providers:');
  adminKeys?.forEach(k => console.log(`  ✓ "${k.provider}"`));
  const adminProviders = adminKeys?.map(k => k.provider) || [];
  console.log('');

  // Step 2: What providers are in providers_registry?
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: providers_registry (is_active=true)                     │');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  const { data: allProviders } = await supabase
    .from('providers_registry')
    .select('id, name, display_name')
    .eq('is_active', true)
    .order('name');

  console.log('All active providers (id → name → display_name):');
  allProviders?.forEach(p => console.log(`  "${p.id}" → "${p.name}" → "${p.display_name}"`));
  console.log('');

  // Step 3: What providers would the EXACT matching return?
  // (Changed from fuzzy matching to exact matching to fix Vertex appearing bug)
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Exact Matching (simulating /api/admin/providers/list)   │');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  const matchedProviders = (allProviders || []).filter(p => {
    const normalizedId = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return adminProviders.some(adminKey => {
      const normalizedAdminKey = adminKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Only exact matches - no includes() to prevent partial matching
      return normalizedId === normalizedAdminKey ||
             normalizedName === normalizedAdminKey;
    });
  });

  console.log('Providers that would be returned by API (after fuzzy match):');
  matchedProviders.forEach(p => console.log(`  ✓ id="${p.id}", name="${p.name}", display="${p.display_name}"`));
  console.log('');

  // Step 4: For each matched provider, check if models exist
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Models per Provider (models_registry)                   │');
  console.log('└──────────────────────────────────────────────────────────────────┘');

  for (const provider of matchedProviders) {
    const { data: models, error } = await supabase
      .from('models_registry')
      .select('id, name, display_name')
      .eq('provider_id', provider.id)
      .eq('is_active', true)
      .limit(3);

    if (error) {
      console.log(`  ❌ provider_id="${provider.id}" → ERROR: ${error.message}`);
    } else if (!models || models.length === 0) {
      console.log(`  ❌ provider_id="${provider.id}" → NO MODELS FOUND`);
    } else {
      console.log(`  ✓ provider_id="${provider.id}" → ${models.length}+ models`);
      models.forEach(m => console.log(`      - ${m.display_name} (${m.name})`));
    }
  }
  console.log('');

  // Step 5: What does models_registry actually have?
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: All DISTINCT provider_id values in models_registry      │');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  const { data: modelProviderIds } = await supabase
    .from('models_registry')
    .select('provider_id')
    .eq('is_active', true);

  const uniqueProviderIds = [...new Set(modelProviderIds?.map(m => m.provider_id) || [])].sort();
  console.log('Unique provider_id values in models_registry:');
  uniqueProviderIds.forEach(pid => console.log(`  "${pid}"`));
  console.log('');

  // Step 6: THE MISMATCH CHECK - this is the key
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 6: MISMATCH DETECTION                                      │');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  const providerIdsFromRegistry = matchedProviders.map(p => p.id);
  const modelProviderIdsSet = new Set(uniqueProviderIds);

  console.log('Checking if UI provider IDs exist in models_registry...');
  for (const pid of providerIdsFromRegistry) {
    if (modelProviderIdsSet.has(pid)) {
      console.log(`  ✓ "${pid}" exists in models_registry`);
    } else {
      console.log(`  ❌ "${pid}" MISSING from models_registry!`);
    }
  }
  console.log('');

  // Step 7: The JOIN test - this is what the API actually does
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 7: INNER JOIN Test (what the API query does)               │');
  console.log('└──────────────────────────────────────────────────────────────────┘');

  for (const provider of matchedProviders) {
    const { data, error } = await supabase
      .from('models_registry')
      .select(`
        id, provider_id, name, display_name,
        providers_registry!inner(id, name, display_name)
      `)
      .eq('is_active', true)
      .eq('provider_id', provider.id)
      .limit(2);

    if (error) {
      console.log(`  ❌ provider_id="${provider.id}" INNER JOIN FAILED: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ❌ provider_id="${provider.id}" → 0 models after JOIN`);
    } else {
      console.log(`  ✓ provider_id="${provider.id}" → ${data.length}+ models returned`);
    }
  }
  console.log('');

  // Conclusion
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  DIAGNOSIS COMPLETE                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
}

diagnose().catch(console.error);
