const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: rt } = await client.from('portal_room_types').select('id, name').limit(1);
  const rid = rt[0].id;
  
  const { count: t } = await client.from('portal_tariffs').select('*', { count: 'exact', head: true }).eq('room_type_id', rid);
  const { count: a } = await client.from('portal_allotments').select('*', { count: 'exact', head: true }).eq('room_type_id', rid);
  
  console.log('Room:', rt[0].name);
  console.log('Tariff Count:', t);
  console.log('Allotment Count:', a);
  
  const { data: qA } = await client.from('portal_allotments').select('date').eq('room_type_id', rid).limit(1);
  console.log('Allotment Date format:', qA[0]?.date);
}
check();
