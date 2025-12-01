import { supabase } from '/Users/venkat/mcp-execution/dist/index.js';

async function cleanupDatabase() {
  console.log('🔧 Initializing Supabase connection...');
  await supabase.initialize();

  console.log('\n📊 Querying stale VM records...');

  // Find VMs that should be destroyed (created >1 hour ago, still marked as running)
  const staleVMQuery = `
    SELECT vm_id, vm_type, status, ip_address, created_at
    FROM vms
    WHERE status IN ('running', 'creating')
    AND created_at < NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC;
  `;

  const staleVMs = await supabase.executeSQL(staleVMQuery);
  console.log(`Found ${staleVMs.length} stale VM records:`);
  console.log(JSON.stringify(staleVMs, null, 2));

  console.log('\n📊 Querying stuck auth sessions...');

  // Find auth sessions that never completed (started >10 min ago)
  const staleSessions = await supabase.executeSQL(`
    SELECT session_id, provider, status, started_at, browser_vm_id
    FROM auth_sessions
    WHERE status IN ('started', 'ready', 'awaiting_credentials')
    AND started_at < NOW() - INTERVAL '10 minutes'
    ORDER BY started_at DESC;
  `);

  console.log(`Found ${staleSessions.length} stuck auth sessions:`);
  console.log(JSON.stringify(staleSessions, null, 2));

  // Cleanup stale VMs
  if (staleVMs.length > 0) {
    console.log('\n🧹 Marking stale VMs as destroyed...');
    const vmIds = staleVMs.map(vm => `'${vm.vm_id}'`).join(',');

    const updateVMs = await supabase.executeSQL(`
      UPDATE vms
      SET status = 'destroyed',
          destroyed_at = NOW(),
          error_message = 'Cleanup: VM was stale (created >1h ago)'
      WHERE vm_id IN (${vmIds})
      RETURNING vm_id, status;
    `);

    console.log(`✅ Updated ${updateVMs.length} VM records to destroyed`);
  }

  // Cleanup stuck sessions
  if (staleSessions.length > 0) {
    console.log('\n🧹 Marking stuck sessions as timeout...');
    const sessionIds = staleSessions.map(s => `'${s.session_id}'`).join(',');

    const updateSessions = await supabase.executeSQL(`
      UPDATE auth_sessions
      SET status = 'timeout',
          error_message = 'Cleanup: session expired (>10 minutes old)',
          completed_at = NOW()
      WHERE session_id IN (${sessionIds})
      RETURNING session_id, status;
    `);

    console.log(`✅ Updated ${updateSessions.length} session records to timeout`);
  }

  console.log('\n📊 Final database state summary...');

  const activeVMs = await supabase.executeSQL(`
    SELECT status, vm_type, COUNT(*) as count
    FROM vms
    GROUP BY status, vm_type
    ORDER BY status, vm_type;
  `);

  console.log('VM status summary:');
  console.log(JSON.stringify(activeVMs, null, 2));

  const sessionSummary = await supabase.executeSQL(`
    SELECT status, COUNT(*) as count
    FROM auth_sessions
    WHERE created_at > NOW() - INTERVAL '1 day'
    GROUP BY status
    ORDER BY status;
  `);

  console.log('\nAuth session summary (last 24h):');
  console.log(JSON.stringify(sessionSummary, null, 2));

  console.log('\n✅ Database cleanup complete!');
}

cleanupDatabase().catch(err => {
  console.error('❌ Database cleanup failed:', err);
  process.exit(1);
});
