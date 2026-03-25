const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: q } = await client.from('portal_allotments').select('room_type_id, date, available_quantity').eq('date', '2026-04-01');
  console.log(`Found ${q.length} allotments for 2026-04-01`);
  if (q.length > 0) {
    console.log('Sample Allotment:', JSON.stringify(q[0], null, 2));
  }
}
check();
