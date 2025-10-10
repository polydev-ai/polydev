#!/usr/bin/env node

/**
 * Script to increase max_tokens from 1000 to 10,000 across all tables
 * Fixes the Gemini MAX_TOKENS issue
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🚀 Starting max_tokens migration to 10,000...\n');

  try {
    // 1. Update api_keys table
    console.log('📝 Updating api_keys table...');
    const { data: apiKeysData, error: apiKeysError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE api_keys
        SET
          max_tokens = 10000,
          updated_at = NOW()
        WHERE max_tokens < 10000 OR max_tokens IS NULL;
      `
    });

    if (apiKeysError) {
      console.log('⚠️  Using fallback method for api_keys...');
      // Fallback: Use direct SQL
      const { data, error: fallbackError } = await supabase
        .from('api_keys')
        .update({ max_tokens: 10000, updated_at: new Date().toISOString() })
        .lt('max_tokens', 10000);

      if (fallbackError) {
        console.error('   ❌ Error updating api_keys:', fallbackError.message);
      } else {
        console.log('   ✅ api_keys updated successfully');
      }
    } else {
      console.log('   ✅ api_keys updated successfully');
    }

    // 2. Update provider_configurations table
    console.log('\n📝 Updating provider_configurations table...');
    const { data: providersData, error: providersError } = await supabase
      .from('provider_configurations')
      .select('*');

    if (providersError) {
      console.error('   ❌ Error fetching provider_configurations:', providersError.message);
    } else {
      console.log(`   Found ${providersData.length} providers`);

      for (const provider of providersData) {
        const { error: updateError } = await supabase
          .from('provider_configurations')
          .update({
            max_output_tokens_premium: 10000,
            max_output_tokens_normal: 10000,
            max_output_tokens_eco: 10000,
            max_output_tokens_default: 10000,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${provider.provider_name}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated ${provider.provider_name} to 10,000 tokens`);
        }
      }
    }

    // 3. Update admin_pricing_config table
    console.log('\n📝 Updating admin_pricing_config table...');
    const { error: adminConfigError } = await supabase
      .from('admin_pricing_config')
      .upsert({
        config_key: 'global_max_output_tokens',
        config_value: { max_tokens: 10000 },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'config_key'
      });

    if (adminConfigError) {
      console.error('   ❌ Error updating admin_pricing_config:', adminConfigError.message);
    } else {
      console.log('   ✅ admin_pricing_config updated successfully');
    }

    // 4. Verify changes
    console.log('\n📊 Verifying changes...');

    const { data: apiKeysVerify } = await supabase
      .from('api_keys')
      .select('max_tokens')
      .order('max_tokens', { ascending: true });

    if (apiKeysVerify) {
      const min = apiKeysVerify[0]?.max_tokens || 0;
      const max = apiKeysVerify[apiKeysVerify.length - 1]?.max_tokens || 0;
      const avg = apiKeysVerify.reduce((sum, k) => sum + (k.max_tokens || 0), 0) / apiKeysVerify.length;

      console.log(`   api_keys: ${apiKeysVerify.length} rows`);
      console.log(`   - Min: ${min}, Max: ${max}, Avg: ${avg.toFixed(0)}`);
    }

    const { data: providersVerify } = await supabase
      .from('provider_configurations')
      .select('provider_name, max_output_tokens_default, max_output_tokens_premium');

    if (providersVerify) {
      console.log(`\n   provider_configurations: ${providersVerify.length} providers`);
      providersVerify.forEach(p => {
        console.log(`   - ${p.provider_name}: default=${p.max_output_tokens_default}, premium=${p.max_output_tokens_premium}`);
      });
    }

    const { data: adminConfigVerify } = await supabase
      .from('admin_pricing_config')
      .select('*')
      .eq('config_key', 'global_max_output_tokens')
      .single();

    if (adminConfigVerify) {
      console.log(`\n   admin_pricing_config: ${JSON.stringify(adminConfigVerify.config_value)}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test Gemini response in the Polydev MCP tool');
    console.log('   2. Verify that thoughtsTokenCount no longer consumes all tokens');
    console.log('   3. Check that Gemini returns full content instead of empty response\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
