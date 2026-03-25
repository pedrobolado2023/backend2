import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class BookingService {
  constructor(private supabaseService: SupabaseService) {}

  async searchAvailability(query: { hotelName?: string; checkIn: string; checkOut: string; adults?: string; children?: string }) {
    const client = this.supabaseService.getClient();
    const totalGuests = Number(query.adults || 0) + Number(query.children || 0);
    
    // 1. Fetch hotels and room types
    let hotelQuery = client
      .from('portal_hotels')
      .select(`
        id, name, location, image_url,
        portal_room_types (
          id, name, max_occupancy
        )
      `);

    if (query.hotelName) {
      hotelQuery = hotelQuery.ilike('name', `%${query.hotelName}%`);
    }

    const { data: hotels, error: hotelError } = await hotelQuery;
    if (hotelError) throw hotelError;

    const allRoomTypes = (hotels as any[]).flatMap(h => 
      h.portal_room_types.map((rt: any) => ({ ...rt, hotel: h }))
    ).filter((rt: any) => totalGuests === 0 || rt.max_occupancy >= totalGuests);

    if (allRoomTypes.length === 0) return [];

    const roomTypeIds = allRoomTypes.map((rt: any) => rt.id);
    const daysRequested = this.getDaysDifference(query.checkIn, query.checkOut);

    // 2. Batch fetch Allotments for all room types
    const { data: allAllotments, error: allotmentError } = await client
      .from('portal_allotments')
      .select('room_type_id, date, available_quantity')
      .in('room_type_id', roomTypeIds)
      .gte('date', query.checkIn)
      .lt('date', query.checkOut);

    if (allotmentError) throw allotmentError;

    // 3. Batch fetch Tariffs for all room types
    const { data: allTariffs, error: tariffError } = await client
      .from('portal_tariffs')
      .select('room_type_id, date, net_rate, final_rate')
      .in('room_type_id', roomTypeIds)
      .gte('date', query.checkIn)
      .lt('date', query.checkOut);

    if (tariffError) throw tariffError;

    // 4. Process results in memory
    const results: any[] = [];
    
    for (const rt of allRoomTypes) {
      const rtAllotments = allAllotments.filter(a => a.room_type_id === rt.id);
      
      // Verify availability
      const isAvailable = rtAllotments.length === daysRequested && 
                         rtAllotments.every(a => a.available_quantity > 0);
      
      if (!isAvailable) continue;

      const rtTariffs = allTariffs.filter(t => t.room_type_id === rt.id);
      if (rtTariffs.length !== daysRequested) continue;

      const totalPriceNet = rtTariffs.reduce((acc, t) => acc + Number(t.net_rate), 0);
      const baseFinalPrice = rtTariffs.reduce((acc, t) => acc + Number(t.final_rate), 0);
      const taxAmount = baseFinalPrice * 0.04;
      const totalPriceFinal = baseFinalPrice + taxAmount;

      results.push({
        hotelId: rt.hotel.id,
        hotelName: rt.hotel.name,
        location: rt.hotel.location,
        imageUrl: rt.hotel.image_url,
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        totalPriceNet,
        baseFinalPrice,
        taxAmount,
        totalPriceFinal,
        tariffs: rtTariffs
      });
    }

    return results;
  }

  async createReservation(userId: string, agencyId: string, data: { roomTypeId: string; checkIn: string; checkOut: string; guestDetails: any; totalPrice: number }) {
    const client = this.supabaseService.getClient();

    // 1. Verificar disponibilidade novamente (Atomicidade aproximada no Supabase via RPC ou Transação seria ideal, mas usaremos lógica de aplicação aqui para simplicidade)
    const { data: allotments, error: allotmentError } = await client
      .from('portal_allotments')
      .select('id, available_quantity, date')
      .eq('room_type_id', data.roomTypeId)
      .gte('date', data.checkIn)
      .lt('date', data.checkOut);

    if (allotmentError || allotments.length === 0) throw new Error('Disponibilidade não encontrada');
    
    const daysRequested = this.getDaysDifference(data.checkIn, data.checkOut);
    if (allotments.length !== daysRequested || !allotments.every(a => a.available_quantity > 0)) {
      throw new Error('Quarto não disponível para o período selecionado');
    }

    // 2. Decrementar Allotment para cada dia
    for (const allotment of allotments) {
      await client
        .from('portal_allotments')
        .update({ available_quantity: allotment.available_quantity - 1 })
        .eq('id', allotment.id);
    }

    // 3. Criar Reserva
    const voucherCode = `ENJ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { data: reservation, error: resError } = await client
      .from('portal_reservations')
      .insert({
        agency_id: agencyId,
        user_id: userId,
        room_type_id: data.roomTypeId,
        check_in: data.checkIn,
        check_out: data.checkOut,
        total_price: data.totalPrice,
        status: 'confirmed',
        voucher_code: voucherCode,
        guest_details: data.guestDetails
      })
      .select()
      .single();

    if (resError) throw resError;

    return reservation;
  }

  async getReservations(email: string) {
    const client = this.supabaseService.getClient();
    const { data: user } = await client
      .from('portal_users')
      .select('id, agency_id')
      .eq('email', email)
      .single();

    if (!user) return [];

    const { data, error } = await client
      .from('portal_reservations')
      .select(`
        *,
        portal_room_types (
          id,
          name,
          portal_hotels (
            id,
            name
          )
        )
      `)
      .eq('agency_id', user.agency_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  }

  async getUserByEmail(email: string) {
    const client = this.supabaseService.getClient();
    return client
      .from('portal_users')
      .select('id, agency_id')
      .eq('email', email)
      .single();
  }

  async getAllotments() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('portal_allotments')
      .select(`
        id,
        date,
        total_quantity,
        available_quantity,
        portal_room_types (
          id,
          name,
          portal_hotels (
            id,
            name
          )
        )
      `)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateAllotment(id: string, availableQuantity: number) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('portal_allotments')
      .update({ available_quantity: availableQuantity })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCalendarData(hotelName?: string, startDate: string = '2026-04-01') {
    const client = this.supabaseService.getClient();
    
    // 1. Fetch hotel IDs
    let queryBuilder = client.from('portal_hotels').select('id');
    if (hotelName) {
      queryBuilder = queryBuilder.ilike('name', hotelName);
    }
    const { data: hotels } = await queryBuilder;
    
    if (!hotels || hotels.length === 0) return {};

    const hotelIds = hotels.map(h => h.id);

    // 2. Fetch room type IDs
    const { data: roomTypes } = await client
      .from('portal_room_types')
      .select('id')
      .in('hotel_id', hotelIds);

    if (!roomTypes || roomTypes.length === 0) return {};

    const roomTypeIds = roomTypes.map(rt => rt.id);

    // Calculate end date (default 4 months from start)
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 4);
    const endDate = end.toISOString().split('T')[0];

    // 3. Batch fetch Tariffs and Allotments
    const [tariffsRes, allotmentsRes] = await Promise.all([
      client
        .from('portal_tariffs')
        .select('date, final_rate, room_type_id')
        .in('room_type_id', roomTypeIds)
        .gte('date', startDate)
        .lte('date', endDate),
      client
        .from('portal_allotments')
        .select('date, available_quantity, room_type_id')
        .in('room_type_id', roomTypeIds)
        .gte('date', startDate)
        .lte('date', endDate)
    ]);

    if (tariffsRes.error) throw tariffsRes.error;
    if (allotmentsRes.error) throw allotmentsRes.error;

    // 4. Index allotments for fast lookup
    const allotmentMap: Record<string, number> = {};
    allotmentsRes.data?.forEach(a => {
      allotmentMap[`${a.room_type_id}_${a.date}`] = Number(a.available_quantity);
    });

    // 5. Build calendar with the best price for each date
    const calendar: Record<string, { price: number; minStay: number; available: boolean }> = {};

    tariffsRes.data?.forEach(t => {
      const date = t.date;
      const qty = allotmentMap[`${t.room_type_id}_${date}`] || 0;
      const isAvailable = qty > 0;

      if (!calendar[date]) {
        calendar[date] = { price: Infinity, minStay: 1, available: false };
      }

      if (isAvailable) {
        calendar[date].available = true;
        const price = Number(t.final_rate);
        if (price < calendar[date].price) {
          calendar[date].price = price;
        }
      }
    });

    // Final cleanup: remove Infinity
    Object.keys(calendar).forEach(d => {
      if (calendar[d].price === Infinity) calendar[d].price = 0;
    });

    return calendar;
  }

  private getDaysDifference(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
