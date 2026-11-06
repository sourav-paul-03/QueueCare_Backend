import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitTimeService } from './wait-time.service';
import { WaitTimeController } from './wait-time.controller';
import { WaitEstimateLog } from './entities/wait-estimate-log.entity';
import { QueueToken } from '../queue/entities/queue-token.entity';
import { DailyDoctorStat } from '../analytics/entities/daily-doctor-stat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WaitEstimateLog, QueueToken, DailyDoctorStat])],
  controllers: [WaitTimeController],
  providers: [WaitTimeService],
  exports: [WaitTimeService, TypeOrmModule],
})
export class WaitTimeModule {}
