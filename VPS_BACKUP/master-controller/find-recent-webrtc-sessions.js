// Load environment variables from .env file
require('dotenv').config({ path: '/opt/master-controller/.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('=== Finding Recent Sessions with WebRTC Answers ===');
  console.log('');

  // Query for recent sessions with webrtc_answer populated
  const { data: sessions, error } = await supabase
    .from('auth_sessions')
    .select('session_id, user_id, provider, created_at, status')
    .not('webrtc_answer', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('❌ Query failed:', error.message);
    process.exit(1);
  }

  if (!sessions || sessions.length === 0) {
    console.log('❌ No sessions with WebRTC answers found in database');
    process.exit(0);
  }

  console.log(`✅ Found ${sessions.length} recent sessions with WebRTC answers:`);
  console.log('');

  sessions.forEach((session, idx) => {
    console.log(`${idx + 1}. Session ID: ${session.session_id}`);
    console.log(`   User ID: ${session.user_id}`);
    console.log(`   Provider: ${session.provider}`);
    console.log(`   Created: ${session.created_at}`);
    console.log(`   Status: ${session.status}`);
    console.log('');
  });

  // Pick the most recent session for SSRC verification
  const mostRecent = sessions[0];
  console.log('=== Verifying SSRC Fix on Most Recent Session ===');
  console.log('Session ID:', mostRecent.session_id);
  console.log('');

  // Fetch full answer data
  const { data: answerData, error: answerError } = await supabase
    .from('auth_sessions')
    .select('webrtc_answer')
    .eq('session_id', mostRecent.session_id)
    .single();

  if (answerError) {
    console.log('❌ Failed to fetch answer:', answerError.message);
    process.exit(1);
  }

  // Parse JSON-stringified answer
  const answer = JSON.parse(answerData.webrtc_answer);

  console.log('=== SDP Answer Content ===');
  console.log(answer.sdp);
  console.log('');
  console.log('=== Checking for SSRC lines ===');
  const ssrcLines = answer.sdp.split('\n').filter(line => line.includes('a=ssrc:'));
  ssrcLines.forEach(line => console.log(line));

  const ssrcValues = ssrcLines.map(line => {
    const match = line.match(/a=ssrc:(\d+)/);
    return match ? match[1] : null;
  }).filter(v => v);

  console.log('');
  console.log('=== SSRC Values Found ===');
  ssrcValues.forEach((val, idx) => console.log('SSRC #' + (idx + 1) + ':', val));

  const uniqueSSRCs = [...new Set(ssrcValues)];
  console.log('');
  if (uniqueSSRCs.length === 1) {
    console.log('✅ SSRC FIX CONFIRMED: All ' + ssrcValues.length + ' SSRC attributes use the same value:', uniqueSSRCs[0]);
  } else if (uniqueSSRCs.length === 0) {
    console.log('⚠️  No SSRC attributes found in SDP answer');
  } else {
    console.log('❌ SSRC FIX FAILED: Found ' + uniqueSSRCs.length + ' different SSRC values:', uniqueSSRCs.join(', '));
  }

  process.exit(0);
})();
