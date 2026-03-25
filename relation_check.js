const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { count: tCount } = await client.from('portal_tariffs').select('*', { count: 'exact', head: true }).gte('date', '2026-04-01');
  const { count: aCount } = await client.from('portal_allotments').select('*', { count: 'exact', head: true }).gte('date', '2026-04-01');
  
  console.log(`Summary for 2026-04-01+: Tariffs=${tCount}, Allotments=${aCount}`);
  
  const { data: q1 } = await client.from('portal_tariffs').select('date, final_rate, room_type_id').eq('date', '2026-04-01').limit(1);
  if (q1.length) {
    const { data: q2 } = await client.from('portal_allotments').select('available_quantity').eq('date', q1[0].date).eq('room_type_id', q1[0].room_type_id);
    console.log(`Relation check for ${q1[0].date}: Price=${q1[0].final_rate}, AllotmentFound=${q2.length > 0 ? q2[0].available_quantity : 'NOT FOUND'}`);
  }
}
check();
