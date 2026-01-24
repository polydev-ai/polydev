const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Connecting to:', process.env.SUPABASE_URL);

  // Test if mcp_tokens table exists
  const { data: tokens, error: tokenErr } = await supabase
    .from('mcp_tokens')
    .select('id')
    .limit(1);

  console.log('mcp_tokens exists:', tokenErr ? 'NO - ' + tokenErr.message : 'YES');

  // Test if user_credits table exists
  const { data: credits, error: creditsErr } = await supabase
    .from('user_credits')
    .select('id')
    .limit(1);

  console.log('user_credits exists:', creditsErr ? 'NO - ' + creditsErr.message : 'YES');

  // Test if perspective_usage table exists
  const { data: persp, error: perspErr } = await supabase
    .from('perspective_usage')
    .select('id')
    .limit(1);

  console.log('perspective_usage exists:', perspErr ? 'NO - ' + perspErr.message : 'YES');
}

run().catch(console.error);
