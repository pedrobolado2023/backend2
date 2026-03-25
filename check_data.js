const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: hotels } = await client.from('portal_hotels').select('id, name');
  console.log('Hotels:', hotels.map(h => h.name));

  const { data: sampleTariffs } = await client.from('portal_tariffs')
    .select('date, final_rate, room_type_id')
    .gte('date', '2026-04-01')
    .limit(3);
  console.log('Sample April Tariffs:', JSON.stringify(sampleTariffs, null, 2));

  const { data: sampleAllotments } = await client.from('portal_allotments')
    .select('date, available_quantity, room_type_id')
    .gte('date', '2026-04-01')
    .limit(3);
  console.log('Sample April Allotments:', JSON.stringify(sampleAllotments, null, 2));
}
check();
