const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const hotelName = 'Enjoy Olimpia Park Resort';
  const { data: hotels } = await client.from('portal_hotels').select('id').eq('name', hotelName);
  const hotelIds = hotels.map(h => h.id);
  const { data: roomTypes } = await client.from('portal_room_types').select('id').in('hotel_id', hotelIds);
  const roomTypeIds = roomTypes.map(rt => rt.id);

  const { data: t } = await client.from('portal_tariffs').select('*').in('room_type_id', roomTypeIds).eq('date', '2026-04-01');
  const { data: a } = await client.from('portal_allotments').select('*').in('room_type_id', roomTypeIds).eq('date', '2026-04-01');
  
  console.log(`Hotel: ${hotelName}, Tariffs=${t.length}, Allotments=${a.length}`);
}
test();
