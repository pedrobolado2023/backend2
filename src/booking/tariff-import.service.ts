import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as XLSX from 'xlsx';

@Injectable()
export class TariffImportService {
  private readonly logger = new Logger(TariffImportService.name);

  constructor(private supabaseService: SupabaseService) {}

  async ensureDataExists() {
    const client = this.supabaseService.getClient();
    
    // 1. Garantir Hotéis
    const hotels = [
      'Enjoy Olimpia Park Resort',
      'Enjoy Solar das Aguas'
    ];

    const hotelMap = new Map<string, string>();
    for (const name of hotels) {
      let { data: hotel } = await client.from('portal_hotels').select('id').eq('name', name).single();
      if (!hotel) {
        this.logger.log(`Criando hotel: ${name}`);
        const { data: newHotel, error } = await client.from('portal_hotels').insert({
          name,
          location: 'Olímpia, SP'
        }).select().single();
        if (error) throw error;
        hotel = newHotel;
      }
      if (hotel) {
        hotelMap.set(name, hotel.id);
      }
    }

    // 2. Garantir Room Types para cada hotel
    const roomNames = [
      'Luxo Acessibilidade',
      'Luxo Casal',
      'Luxo Mar',
      'Luxo Twin',
      'Luxo com Banheira',
      'Suíte Nacional',
      'Suíte Sereia',
      'Suíte Luxo'
    ];

    for (const [hotelName, hotelId] of hotelMap.entries()) {
      for (const roomName of roomNames) {
        const { data: roomType } = await client
          .from('portal_room_types')
          .select('id')
          .eq('hotel_id', hotelId)
          .eq('name', roomName)
          .single();

        if (!roomType) {
          this.logger.log(`Criando quarto '${roomName}' para hotel '${hotelName}'`);
          const { error } = await client.from('portal_room_types').insert({
            hotel_id: hotelId,
            name: roomName,
            max_occupancy: 4
          });
          if (error) throw error;
        }
      }
    }
    
    return hotelMap;
  }

  async importFromBuffer(buffer: Buffer) {
    const client = this.supabaseService.getClient();
    
    // 0. Sincronizar banco primeiro
    await this.ensureDataExists();

    this.logger.log(`Processando buffer Excel de importação`);

    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (e) {
      this.logger.error(`Erro ao ler arquivo: ${e.message}`);
      throw new Error(`Não foi possível ler o arquivo Excel enviado.`);
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const markup = 0.70;
    const multiplier = 1 + markup;

    // 1. Extrair preços de pensão e quartos
    const pricesMap = new Map<string, { price: number; allotment: number }>();


    for (const row of data) {
      const label = (row['__EMPTY'] || '').toString().trim();
      
      // Procuramos pelos quartos específicos
      const targetRooms = [
        'Luxo Acessibilidade', 'Luxo Casal', 'Luxo Mar', 
        'Luxo Twin', 'Luxo com Banheira', 'Suíte Nacional', 'Suíte Sereia', 'Suíte Luxo'
      ];

      if (targetRooms.includes(label)) {
        // Tentar Dbl (Adulto_1) primeiro, fallback para Adulto
        const price = typeof row['Adulto_1'] === 'number' ? row['Adulto_1'] : (typeof row['Adulto'] === 'number' ? row['Adulto'] : 0);
        
        // Tentar encontrar allotment no final da linha (assumindo que seja uma das colunas vazias ou nomeadas tardiamente)
        const allotment = typeof row['Allotment'] === 'number' ? row['Allotment'] : 10;

        if (price > 0) {
          pricesMap.set(label, { price, allotment });
        }
      }
    }

    if (pricesMap.size === 0) {
      throw new Error('Nenhum quarto encontrado no Excel enviado.');
    }

    // 2. Buscar TODOS os IDs de quartos existentes
    const { data: dbRoomTypes, error: roomError } = await client
      .from('portal_room_types')
      .select('id, name, hotel_id');

    if (roomError) throw roomError;

    const batch: any[] = [];
    const allotmentBatch: any[] = [];
    
    // Início em Abril 2026 para os testes
    const startDate = new Date('2026-04-01');
    
    // 3. Aplicar as tarifas do Excel para TODOS os hotéis que tenham esses quartos
    for (const [roomName, info] of pricesMap.entries()) {
      const { price: baseNetRate } = info as any;
      const matchingRooms = dbRoomTypes.filter(rt => rt.name.toLowerCase() === roomName.toLowerCase());
      
      this.logger.log(`Room "${roomName}" found in ${matchingRooms.length} records in DB`);

      const markup = 0.30;
      const multiplier = 1 + markup;
      const finalRate = baseNetRate * multiplier;

      // Calcular dias até 01/01/2027
      const endDate = new Date('2027-01-01');
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir 01/01

      for (const roomType of matchingRooms) {
        for (let i = 0; i < diffDays; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dateString = date.toISOString().split('T')[0];

          batch.push({
            room_type_id: roomType.id,
            date: dateString,
            net_rate: baseNetRate,
            final_rate: finalRate,
            commission_percentage: 10.0,
            min_stay: 1
          });

          allotmentBatch.push({
            room_type_id: roomType.id,
            date: dateString,
            total_quantity: 20,
            available_quantity: 20
          });
        }
      }
    }


    this.logger.log(`Total batch: ${batch.length} records to upsert.`);



    if (batch.length === 0) {
      throw new Error('Nenhum mapeamento entre Excel e Banco foi possível.');
    }

    // 4. Upsert no Supabase
    this.logger.log(`Realizando upsert de ${batch.length} tarifas e allotments para múltiplos hotéis...`);
    
    const { error: upsertError } = await client
      .from('portal_tariffs')
      .upsert(batch, { onConflict: 'room_type_id,date' });

    if (upsertError) throw upsertError;

    const { error: allotmentError } = await client
      .from('portal_allotments')
      .upsert(allotmentBatch, { onConflict: 'room_type_id,date' });

    if (allotmentError) throw allotmentError;

    return {
      message: 'Tarifário e Allotment importados com sucesso para Enjoy Olimpia e Enjoy Solar (2026)!',
      roomsFound: Array.from(pricesMap.keys()),
      totalRecords: batch.length
    };
  }
}
