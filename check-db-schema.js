import { supabase } from '/Users/venkat/mcp-execution/dist/index.js';

async function checkDatabaseSchema() {
  console.log('🔍 Checking auth_sessions table schema...\n');

  await supabase.initialize();

  // Query the schema to see session_id column type
  const schemaQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'auth_sessions'
    ORDER BY ordinal_position;
  `;

  const schema = await supabase.executeSQL(schemaQuery);
  console.log('📊 auth_sessions table schema:');
  console.log(JSON.stringify(schema, null, 2));

  console.log('\n' + '='.repeat(80) + '\n');

  // Check if there are any existing sessions
  const sessionsQuery = `
    SELECT session_id, user_id, provider, status, created_at
    FROM auth_sessions
    LIMIT 5;
  `;

  const sessions = await supabase.executeSQL(sessionsQuery);
  console.log('📋 Sample existing sessions:');
  console.log(JSON.stringify(sessions, null, 2));
}

checkDatabaseSchema().catch(console.error);
