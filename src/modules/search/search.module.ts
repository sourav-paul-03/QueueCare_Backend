import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorClinic])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
