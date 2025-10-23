#!/usr/bin/env node
/**
 * Check all VMs for a specific user
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oxhutuxkthdxvciytwmb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAllVMs() {
  const userId = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';

  console.log('\n=== ALL VMs FOR USER ===\n');
  console.log('User ID:', userId);
  console.log();

  const { data: vms, error } = await supabase
    .from('vms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${vms.length} VMs:\n`);

  for (const vm of vms) {
    console.log('---');
    console.log('VM ID:', vm.vm_id);
    console.log('Type:', vm.vm_type);
    console.log('Status:', vm.status);
    console.log('IP:', vm.vm_ip || 'N/A');
    console.log('Created:', vm.created_at);
    console.log('Destroyed:', vm.destroyed_at || 'N/A');
    console.log('Last Heartbeat:', vm.last_heartbeat || 'N/A');
    console.log();
  }
}

checkAllVMs().catch(console.error);
