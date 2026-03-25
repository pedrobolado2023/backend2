const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  try {
    const hotelName = 'Enjoy Olimpia Park Resort';
    const { data: hotels, error: hErr } = await client.from('portal_hotels').select('id').ilike('name', hotelName);
    if (hErr) throw hErr;
    if (!hotels.length) { console.log('Hotel not found'); return; }

    const hotelIds = hotels.map(h => h.id);
    const { data: roomTypes, error: rtErr } = await client.from('portal_room_types').select('id, name').in('hotel_id', hotelIds);
    if (rtErr) throw rtErr;
    console.log(`Found ${roomTypes.length} room types for hotel.`);

    const roomTypeIds = roomTypes.map(rt => rt.id);
    const { data: tariffs, error: tErr } = await client.from('portal_tariffs').select('*').in('room_type_id', roomTypeIds).gte('date', '2026-04-01');
    if (tErr) throw tErr;
    
    const { data: allotments, error: aErr } = await client.from('portal_allotments').select('*').in('room_type_id', roomTypeIds).gte('date', '2026-04-01');
    if (aErr) throw aErr;

    console.log(`Tariffs: ${tariffs?.length || 0}, Allotments: ${allotments?.length || 0}`);

    const allotmentMap = new Map();
    allotments?.forEach(a => {
      allotmentMap.set(`${a.room_type_id}_${a.date}`, Number(a.available_quantity));
    });

    const calendar = {};
    tariffs?.forEach(t => {
      const key = `${t.room_type_id}_${t.date}`;
      const qty = allotmentMap.get(key) || 0;
      if (qty > 0) {
        if (!calendar[t.date]) calendar[t.date] = { price: Infinity, available: true };
        const price = Number(t.final_rate);
        if (price < calendar[t.date].price) calendar[t.date].price = price;
      }
    });

    const days = Object.keys(calendar);
    console.log('Available days:', days.length);
    if (days.length > 0) {
      console.log('Sample days:', days.slice(0, 5));
    }
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
