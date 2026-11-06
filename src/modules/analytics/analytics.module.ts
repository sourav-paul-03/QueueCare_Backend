import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { DailyDoctorStat } from './entities/daily-doctor-stat.entity';
import { HourlyLoadStat } from './entities/hourly-load-stat.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyDoctorStat, HourlyLoadStat, DoctorClinic])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService, TypeOrmModule],
})
export class AnalyticsModule {}
