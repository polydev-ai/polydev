const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const userId = process.argv[2] || '5abacdd1-6a9b-48ce-b723-ca8056324c7a';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('=== Querying All Sessions for User ===');
  console.log('User ID:', userId);
  console.log('');

  const { data, error } = await supabase
    .from('auth_sessions')
    .select('session_id, provider, status, created_at, webrtc_answer')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error querying database:', error.message);
  } else if (data && data.length > 0) {
    console.log(`✅ Found ${data.length} sessions for this user:`);
    console.log('');
    data.forEach((session, idx) => {
      console.log(`Session ${idx + 1}:`);
      console.log(`  ID: ${session.session_id}`);
      console.log(`  Provider: ${session.provider}`);
      console.log(`  Status: ${session.status}`);
      console.log(`  Created: ${session.created_at}`);
      console.log(`  Has WebRTC Answer: ${session.webrtc_answer ? 'YES' : 'NO'}`);
      console.log('');
    });
  } else {
    console.log('❌ No sessions found for this user');
  }

  process.exit(0);
})();
