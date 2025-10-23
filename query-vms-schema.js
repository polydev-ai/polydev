const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function getSchema() {
  // Try to get just one row to see the structure
  const { data, error } = await adminClient
    .from('vms')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('VMs table columns:', data[0] ? Object.keys(data[0]) : 'No data');
    if (data[0]) {
      console.log('\nSample row:', JSON.stringify(data[0], null, 2));
    }
  }
}

getSchema();
