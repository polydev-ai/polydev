// Load environment variables from .env file
require('dotenv').config({ path: '/opt/master-controller/.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const sessionId = process.argv[2] || '3e7a04b3-24b0-4f9a-8fd5-d5014247d3b5';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('=== Querying Database for SDP Answer ===');
  console.log('Session ID:', sessionId);
  console.log('');

  const { data, error } = await supabase
    .from('auth_sessions')
    .select('webrtc_answer')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    console.log('Error querying database:', error.message);
  } else if (data && data.webrtc_answer) {
    console.log('✅ Answer found in database');
    console.log('');

    // Parse JSON-stringified answer
    const answer = JSON.parse(data.webrtc_answer);

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
    } else {
      console.log('❌ SSRC FIX FAILED: Found ' + uniqueSSRCs.length + ' different SSRC values:', uniqueSSRCs.join(', '));
    }
  } else {
    console.log('❌ No answer found in database for this session');
  }

  process.exit(0);
})();
