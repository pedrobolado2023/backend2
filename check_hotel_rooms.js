const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data: hotels } = await client.from('portal_hotels').select('id, name');
  for (const h of hotels) {
    const { count } = await client.from('portal_room_types').select('*', { count: 'exact', head: true }).eq('hotel_id', h.id);
    console.log(`Hotel: ${h.name}, Room Types Count: ${count}`);
  }
}
check();
