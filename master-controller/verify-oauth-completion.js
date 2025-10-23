#!/usr/bin/env node
/**
 * Verify OAuth flow completion for session 13c1d492
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

async function verifyOAuthCompletion() {
  const sessionId = '13c1d492-e250-4dee-b35e-ef2a918ddb0c';
  const userId = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';
  const provider = 'claude_code';

  console.log('\n=== VERIFYING OAUTH FLOW COMPLETION ===\n');

  // 1. Check auth session status
  console.log('1. Checking auth session status...');
  const { data: session, error: sessionError } = await supabase
    .from('auth_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (sessionError) {
    console.error('Error fetching session:', sessionError.message);
  } else {
    console.log('Auth Session:');
    console.log('  Session ID:', session.session_id);
    console.log('  User ID:', session.user_id);
    console.log('  Provider:', session.provider);
    console.log('  Status:', session.status);
    console.log('  Created:', session.created_at);
    console.log('  VM ID:', session.vm_id || 'N/A');
    console.log('  Has Auth URL:', session.auth_url ? 'Yes' : 'No');
    console.log('  Completed At:', session.completed_at || 'N/A');
    console.log();
  }

  // 2. Check credentials
  console.log('2. Checking encrypted credentials...');
  const { data: credentials, error: credError } = await supabase
    .from('provider_credentials')
    .select('credential_id, user_id, provider, created_at, is_valid, encrypted_credentials')
    .eq('user_id', userId)
    .eq('provider', provider)
    .order('created_at', { ascending: false })
    .limit(1);

  if (credError) {
    console.error('Error fetching credentials:', credError.message);
  } else if (credentials && credentials.length > 0) {
    const cred = credentials[0];
    console.log('Credentials Found:');
    console.log('  Credential ID:', cred.credential_id);
    console.log('  User ID:', cred.user_id);
    console.log('  Provider:', cred.provider);
    console.log('  Created:', cred.created_at);
    console.log('  Is Valid:', cred.is_valid);
    console.log('  Encrypted Data Size:', cred.encrypted_credentials ? cred.encrypted_credentials.length : 0, 'bytes');
    console.log();
  } else {
    console.log('No credentials found for this user and provider.');
    console.log();
  }

  // 3. Check CLI VM
  console.log('3. Checking CLI VM...');
  const { data: vms, error: vmError } = await supabase
    .from('vms')
    .select('*')
    .eq('user_id', userId)
    .eq('vm_type', 'cli')
    .is('destroyed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (vmError) {
    console.error('Error fetching VM:', vmError.message);
  } else if (vms && vms.length > 0) {
    const vm = vms[0];
    console.log('CLI VM Found:');
    console.log('  VM ID:', vm.vm_id);
    console.log('  Status:', vm.status);
    console.log('  IP:', vm.vm_ip);
    console.log('  Created:', vm.created_at);
    console.log('  Last Heartbeat:', vm.last_heartbeat || 'N/A');
    console.log();
  } else {
    console.log('No active CLI VM found for this user.');
    console.log();
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');

  const sessionCompleted = session && session.status === 'completed';
  const credentialsExist = credentials && credentials.length > 0;
  const vmExists = vms && vms.length > 0;

  console.log('OAuth Session Completed:', sessionCompleted ? 'YES ✓' : 'NO ✗');
  console.log('Encrypted Credentials Stored:', credentialsExist ? 'YES ✓' : 'NO ✗');
  console.log('CLI VM Exists:', vmExists ? 'YES ✓' : 'NO ✗');

  if (sessionCompleted && credentialsExist && vmExists) {
    console.log('\n✓ OAuth flow completed successfully!');
  } else {
    console.log('\n✗ OAuth flow incomplete or failed.');
  }

  console.log();
}

verifyOAuthCompletion().catch(console.error);
