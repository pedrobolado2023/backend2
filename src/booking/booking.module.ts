import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { TariffImportService } from './tariff-import.service';

@Module({
  providers: [BookingService, TariffImportService],
  controllers: [BookingController]
})
export class BookingModule {}
