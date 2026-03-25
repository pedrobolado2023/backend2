const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect() {
  const { data: sample } = await client.from('portal_allotments').select('*').limit(1);
  console.log('Sample Allotment Row Keys:', Object.keys(sample[0]));
}
inspect();
