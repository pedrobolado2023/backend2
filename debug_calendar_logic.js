const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  const hotelName = 'Enjoy Olimpia Park Resort';
  // Replicar o BookingService.getCalendarData
  const { data: hotels } = await client.from('portal_hotels').select('id').ilike('name', hotelName);
  const hotelIds = hotels.map(h => h.id);
  const { data: roomTypes } = await client.from('portal_room_types').select('id').in('hotel_id', hotelIds);
  const roomTypeIds = roomTypes.map(rt => rt.id);

  const { data: tariffs } = await client.from('portal_tariffs')
    .select('date, final_rate, min_stay, room_type_id')
    .in('room_type_id', roomTypeIds)
    .gte('date', '2026-04-01')
    .lte('date', '2026-12-31');

  const { data: allotments } = await client.from('portal_allotments')
    .select('date, available_quantity, room_type_id')
    .in('room_type_id', roomTypeIds)
    .gte('date', '2026-04-01')
    .lte('date', '2026-12-31');

  console.log(`Tariffs: ${tariffs.length}, Allotments: ${allotments.length}`);

  const allotmentMap = new Map();
  allotments.forEach(a => {
    allotmentMap.set(`${a.room_type_id}_${a.date}`, Number(a.available_quantity));
  });

  const calendar = {};
  tariffs.forEach(t => {
    const key = `${t.room_type_id}_${t.date}`;
    const qty = allotmentMap.get(key) || 0;
    if (qty > 0) {
      if (!calendar[t.date]) calendar[t.date] = { price: Infinity, available: true };
      if (Number(t.final_rate) < calendar[t.date].price) calendar[t.date].price = Number(t.final_rate);
    }
  });

  console.log('Sample Calendar Days:', Object.keys(calendar).slice(0, 5));
}
test();
