const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testFetch() {
  const hotelName = 'Enjoy Olimpia Park Resort';
  
  const { data: hotels } = await client.from('portal_hotels').select('id').ilike('name', hotelName);
  const hotelIds = hotels.map(h => h.id);
  const { data: roomTypes } = await client.from('portal_room_types').select('id').in('hotel_id', hotelIds);
  const roomTypeIds = roomTypes.map(rt => rt.id);

  const { data: tariffs, error: tariffError } = await client
    .from('portal_tariffs')
    .select('date, final_rate, min_stay, room_type_id')
    .in('room_type_id', roomTypeIds)
    .gte('date', '2026-04-01');

  if (tariffError) throw tariffError;

  const { data: allotments, error: allotmentError } = await client
    .from('portal_allotments')
    .select('date, available_quantity, room_type_id')
    .in('room_type_id', roomTypeIds)
    .gte('date', '2026-04-01');

  if (allotmentError) throw allotmentError;

  console.log(`Tariffs: ${tariffs.length}, Allotments: ${allotments.length}`);
}
testFetch();
