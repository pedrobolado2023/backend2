const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: rt } = await client.from('portal_room_types').select('id, name').limit(1);
  const rid = rt[0].id;
  console.log(`Room: ${rt[0].name} (${rid})`);
  
  const { count: t } = await client.from('portal_tariffs').select('*', { count: 'exact', head: true }).eq('room_type_id', rid);
  const { count: a } = await client.from('portal_allotments').select('*', { count: 'exact', head: true }).eq('room_type_id', rid);
  
  console.log(`Tariffs: ${t}, Allotments: ${a}`);
}
check();
