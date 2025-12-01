import { supabase } from '/Users/venkat/mcp-execution/dist/index.js';

async function checkForeignKeyConstraints() {
  console.log('🔍 Checking foreign key constraints on auth_sessions table...\n');
  
  await supabase.initialize();
  
  // Query foreign key constraints
  const fkQuery = `
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'auth_sessions';
  `;
  
  const fkConstraints = await supabase.executeSQL(fkQuery);
  console.log('🔗 Foreign Key Constraints:\n');
  console.log(JSON.stringify(fkConstraints, null, 2));
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Check users table schema
  const usersSchemaQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
  `;
  
  const usersSchema = await supabase.executeSQL(usersSchemaQuery);
  console.log('👤 Users table schema:\n');
  console.log(JSON.stringify(usersSchema, null, 2));
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Check if there are any users in the database
  const userCountQuery = `SELECT COUNT(*) as count FROM users;`;
  const userCount = await supabase.executeSQL(userCountQuery);
  console.log('📊 User count:\n');
  console.log(JSON.stringify(userCount, null, 2));
}

checkForeignKeyConstraints().catch(console.error);
