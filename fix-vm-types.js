// Script to populate vm_type column for all existing VMs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://txahrrpjhxzjtzkivgvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixVMTypes() {
  try {
    console.log('\n=== Fixing vm_type column for existing VMs ===\n');
    
    // Get all VMs where vm_type is NULL
    const { data: vms, error: fetchError } = await supabase
      .from('vms')
      .select('vm_id, type, vm_type')
      .is('vm_type', null);
    
    if (fetchError) {
      console.error('Error fetching VMs:', fetchError);
      process.exit(1);
    }
    
    console.log(`Found ${vms?.length || 0} VMs with NULL vm_type`);
    
    if (!vms || vms.length === 0) {
      console.log('\n✅ All VMs already have vm_type populated!');
      return;
    }
    
    // Update each VM
    let updated = 0;
    let errors = 0;
    
    for (const vm of vms) {
      const { error: updateError } = await supabase
        .from('vms')
        .update({ vm_type: vm.type })
        .eq('vm_id', vm.vm_id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${vm.vm_id}:`, updateError.message);
        errors++;
      } else {
        updated++;
      }
    }
    
    console.log(`\n✅ Updated ${updated} VMs`);
    if (errors > 0) {
      console.log(`❌ ${errors} errors`);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

fixVMTypes();
