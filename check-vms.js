// Temporary script to check VMs in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://txahrrpjhxzjtzkivgvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVMs() {
  try {
    // Get all VMs for the user
    const { data: vms, error } = await supabase
      .from('vms')
      .select('vm_id, user_id, type, vm_type, status, destroyed_at, created_at')
      .eq('user_id', '5abacdd1-6a9b-48ce-b723-ca8056324c7a')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      process.exit(1);
    }

    console.log('\n=== VMs for user 5abacdd1-6a9b-48ce-b723-ca8056324c7a ===\n');
    console.log(`Found ${vms?.length || 0} VM records:\n`);

    if (vms && vms.length > 0) {
      vms.forEach((vm, index) => {
        console.log(`VM #${index + 1}:`);
        console.log(`  vm_id: ${vm.vm_id}`);
        console.log(`  type: ${vm.type || 'NULL'}`);
        console.log(`  vm_type: ${vm.vm_type || 'NULL'} <-- THIS IS THE KEY COLUMN`);
        console.log(`  status: ${vm.status}`);
        console.log(`  destroyed_at: ${vm.destroyed_at || 'NULL (active)'}`);
        console.log(`  created_at: ${vm.created_at}`);
        console.log('');
      });

      // Check specifically for CLI VMs with the query used by findByUserId()
      const { data: cliVM, error: cliError } = await supabase
        .from('vms')
        .select('*')
        .eq('user_id', '5abacdd1-6a9b-48ce-b723-ca8056324c7a')
        .eq('vm_type', 'cli')
        .is('destroyed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('\n=== Result of findByUserId() query (vm_type=\'cli\' AND destroyed_at IS NULL) ===\n');

      if (cliError) {
        console.error('Query error:', cliError);
      } else if (!cliVM || cliVM.length === 0) {
        console.log('❌ NO ACTIVE CLI VM FOUND');
        console.log('This explains why transferCredentialsToCLIVM() fails!');
      } else {
        console.log('✅ FOUND CLI VM:');
        console.log(`  vm_id: ${cliVM[0].vm_id}`);
        console.log(`  vm_type: ${cliVM[0].vm_type}`);
        console.log(`  status: ${cliVM[0].status}`);
        console.log(`  ip_address: ${cliVM[0].ip_address}`);
      }
    } else {
      console.log('No VMs found for this user.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

checkVMs();
