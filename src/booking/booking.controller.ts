import { Controller, Get, Post, Body, Query, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingService } from './booking.service';
import { TariffImportService } from './tariff-import.service';

@Controller('booking')
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private tariffImportService: TariffImportService,
  ) {}

  @Post('import-tariffs')
  @UseInterceptors(FileInterceptor('file'))
  async importTariffs(@UploadedFile() file: any) {
    try {
      if (!file) {
        throw new Error('Nenhum arquivo enviado');
      }
      console.log('Recebendo arquivo para importação:' + file.originalname);
      return await this.tariffImportService.importFromBuffer(file.buffer);
    } catch (error) {
      console.error('Erro na rota import-tariffs:', error);
      throw error;
    }
  }

  @Get('hotels')
  async getHotels() {
    const client = (this.bookingService as any).supabaseService.getClient();
    const { data: hotels } = await client.from('portal_hotels').select('id, name');
    return hotels;
  }

  @Get('search')
  async search(
    @Query('hotelName') hotelName: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
    @Query('adults') adults: string,
    @Query('children') children: string,
  ) {
    return this.bookingService.searchAvailability({ hotelName, checkIn, checkOut, adults, children });
  }

  @Post('reserve')
  async reserve(
    @Body() body: any,
  ) {
    // Para teste, usaremos o e-mail do agente semeado
    const { data: user, error } = await this.bookingService.getUserByEmail('agente@test.com');
    if (error || !user) throw new Error('Usuário de teste não encontrado');
    
    return this.bookingService.createReservation(user.id, user.agency_id, body);
  }

  @Get('reservations')
  async getReservations(@Query('email') email: string) {
    return this.bookingService.getReservations(email);
  }

  @Get('allotments')
  async getAllotments() {
    return this.bookingService.getAllotments();
  }

  @Get('calendar')
  async getCalendar(@Query('hotelName') hotelName: string) {
    return this.bookingService.getCalendarData(hotelName);
  }

  @Post('allotments/:id')
  async updateAllotment(@Param('id') id: string, @Body('availableQuantity') availableQuantity: number) {
    return this.bookingService.updateAllotment(id, availableQuantity);
  }
}
