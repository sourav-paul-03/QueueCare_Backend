import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { DoctorSchedule } from './entities/doctor-schedule.entity';
import { ScheduleBreak } from './entities/schedule-break.entity';
import { ScheduleException } from './entities/schedule-exception.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { ClinicHoliday } from '../clinics/entities/clinic-holiday.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DoctorSchedule,
      ScheduleBreak,
      ScheduleException,
      DoctorClinic,
      ClinicHoliday,
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService, TypeOrmModule],
})
export class SchedulesModule {}
