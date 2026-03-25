const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect() {
  const { data: sample } = await client.from('portal_tariffs').select('*').limit(1);
  if (sample.length) console.log('Columns:', Object.keys(sample[0]));
  else console.log('No data found');
}
inspect();
