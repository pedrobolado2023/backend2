const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect() {
  const { data: cols, error } = await client.rpc('get_table_info', { table_name: 'portal_tariffs' });
  if (error) {
    // Falls back if no RPC
    const { data: sample } = await client.from('portal_tariffs').select('*').limit(1);
    console.log('Sample Row:', JSON.stringify(sample, null, 2));
  } else {
    console.log('Columns:', JSON.stringify(cols, null, 2));
  }
}

inspect();
