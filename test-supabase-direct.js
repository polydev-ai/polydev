/**
 * Direct Supabase Test - Verify auth_sessions table and RLS policies
 * Tests direct insert to isolate the database persistence issue
 */

// Load environment variables from .env file
require('dotenv').config({ path: '/opt/master-controller/.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service key bypasses RLS
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('=== Supabase Direct Insert Test ===');
console.log('');

(async () => {
  // Test 1: Check table schema
  console.log('TEST 1: Checking auth_sessions table schema...');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: schemaData, error: schemaError } = await serviceClient
    .from('auth_sessions')
    .select('*')
    .limit(0);

  if (schemaError) {
    console.log('❌ Table does not exist or is inaccessible:', schemaError.message);
    console.log('Full error:', JSON.stringify(schemaError, null, 2));
    process.exit(1);
  }

  console.log('✅ Table exists and is accessible');
  console.log('');

  // Test 2: Count existing records
  console.log('TEST 2: Counting existing auth_sessions...');
  const { count, error: countError } = await serviceClient
    .from('auth_sessions')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('❌ Count failed:', countError.message);
  } else {
    console.log(`Found ${count} existing sessions in database`);
  }
  console.log('');

  // Test 3: Insert with SERVICE key (bypasses RLS)
  console.log('TEST 3: Testing insert with SERVICE key (bypasses RLS)...');
  const testUserId = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';
  const testProvider = 'test_direct_insert';

  const { data: serviceInsert, error: serviceError } = await serviceClient
    .from('auth_sessions')
    .insert({
      user_id: testUserId,
      provider: testProvider,
      status: 'started',
      timeout_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (serviceError) {
    console.log('❌ Insert with SERVICE key FAILED:', serviceError.message);
    console.log('Error code:', serviceError.code);
    console.log('Error details:', serviceError.details);
    console.log('Error hint:', serviceError.hint);
    console.log('Full error:', JSON.stringify(serviceError, null, 2));
  } else {
    console.log('✅ Insert with SERVICE key SUCCEEDED');
    console.log('Session ID:', serviceInsert.session_id);
    console.log('Created at:', serviceInsert.created_at);
    console.log('');

    // Verify the insert persisted
    console.log('TEST 4: Verifying insert persisted...');
    const { data: verifyData, error: verifyError } = await serviceClient
      .from('auth_sessions')
      .select('*')
      .eq('session_id', serviceInsert.session_id)
      .single();

    if (verifyError) {
      console.log('❌ Verification FAILED - record not found:', verifyError.message);
    } else {
      console.log('✅ Verification SUCCEEDED - record found in database');
      console.log('Full record:', JSON.stringify(verifyData, null, 2));
    }
  }
  console.log('');

  // Test 5: Insert with ANON key (respects RLS)
  console.log('TEST 5: Testing insert with ANON key (respects RLS)...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  const { data: anonInsert, error: anonError } = await anonClient
    .from('auth_sessions')
    .insert({
      user_id: testUserId,
      provider: 'test_anon_insert',
      status: 'started',
      timeout_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (anonError) {
    console.log('❌ Insert with ANON key FAILED:', anonError.message);
    console.log('Error code:', anonError.code);
    console.log('This might indicate RLS policies are blocking inserts');
  } else {
    console.log('✅ Insert with ANON key SUCCEEDED');
    console.log('Session ID:', anonInsert.session_id);
  }
  console.log('');

  // Test 6: Check which key the master controller is actually using
  console.log('TEST 6: Checking which Supabase key master controller uses...');
  console.log('From config/index.js:');
  console.log('  - Service client created at line 9 in db/supabase.js');
  console.log('  - Should use: SUPABASE_SERVICE_KEY');
  console.log('');

  console.log('=== Summary ===');
  if (serviceError) {
    console.log('❌ CRITICAL: Service key insert failed - this is the problem!');
    console.log('Root cause:', serviceError.message);
  } else if (count === 0 && serviceInsert) {
    console.log('✅ Database is working - inserts succeed');
    console.log('❌ Problem: Master controller is not actually calling db.authSessions.create()');
    console.log('Next step: Add explicit logging to browser-vm-auth.js line 32');
  } else {
    console.log('⚠️  Need to investigate further');
  }

  process.exit(0);
})();
