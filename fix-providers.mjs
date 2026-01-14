import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oxhutuxkthdxvciytwmb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c'
);

async function main() {
  // Update model_tiers providers to lowercase to match user_api_keys
  const updates = [
    { from: 'Google', to: 'google' },
    { from: 'OpenAI', to: 'openai' },
    { from: 'Anthropic', to: 'anthropic' },
    { from: 'Cerebras', to: 'cerebras' },
  ];

  console.log('Updating model_tiers providers to lowercase...\n');

  for (const { from, to } of updates) {
    const { data, error } = await supabase
      .from('model_tiers')
      .update({ provider: to })
      .eq('provider', from)
      .select('model_name, provider');

    if (error) {
      console.log(`${from} -> ${to}: ERROR - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`${from} -> ${to}: Updated ${data.length} rows`);
      data.forEach(row => console.log(`  - ${row.model_name}`));
    } else {
      console.log(`${from} -> ${to}: No rows to update`);
    }
  }

  // Verify the changes
  console.log('\n=== After update ===');
  const { data: tiers } = await supabase
    .from('model_tiers')
    .select('model_name, provider')
    .eq('active', true)
    .order('display_order');

  console.table(tiers);
}

main().catch(console.error);
