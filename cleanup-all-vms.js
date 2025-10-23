#!/usr/bin/env node

/**
 * Cleanup Script: Delete all VMs from database
 * Uses Supabase service role to bypass RLS
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create admin client with service role key to bypass RLS
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllVMs() {
  try {
    console.log('🔍 Counting VMs in database...');

    // First, get count of VMs
    const { count, error: countError } = await adminClient
      .from('vms')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count VMs: ${countError.message}`);
    }

    console.log(`📊 Found ${count} VMs to delete`);

    if (count === 0) {
      console.log('✅ No VMs to delete');
      return;
    }

    // Get all VM IDs for logging
    const { data: vms, error: selectError } = await adminClient
      .from('vms')
      .select('id, user_id, status');

    if (selectError) {
      throw new Error(`Failed to fetch VMs: ${selectError.message}`);
    }

    console.log(`\n📋 VMs to be deleted:`);
    console.log(`   Total: ${vms.length}`);
    console.log(`   Running: ${vms.filter(vm => vm.status === 'running').length}`);
    console.log(`   Stopped: ${vms.filter(vm => vm.status === 'stopped').length}`);
    console.log(`   Other: ${vms.filter(vm => vm.status !== 'running' && vm.status !== 'stopped').length}`);

    // Ask for confirmation
    console.log(`\n⚠️  WARNING: This will delete ALL ${count} VMs from the database!`);
    console.log('   This action CANNOT be undone.');

    // In non-interactive mode, auto-confirm
    console.log('\n🗑️  Proceeding with deletion...\n');

    // Delete all VMs
    const { error: deleteError } = await adminClient
      .from('vms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)

    if (deleteError) {
      throw new Error(`Failed to delete VMs: ${deleteError.message}`);
    }

    // Verify deletion
    const { count: remainingCount, error: verifyError } = await adminClient
      .from('vms')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      throw new Error(`Failed to verify deletion: ${verifyError.message}`);
    }

    console.log(`✅ Successfully deleted ${count} VMs`);
    console.log(`📊 Remaining VMs: ${remainingCount}`);

    if (remainingCount > 0) {
      console.log(`⚠️  Warning: ${remainingCount} VMs still remain in database`);
    }

  } catch (error) {
    console.error('\n❌ Error during VM cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
deleteAllVMs()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
