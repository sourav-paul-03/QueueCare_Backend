import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { Clinic } from './entities/clinic.entity';
import { ClinicMembership } from './entities/clinic-membership.entity';
import { DoctorClinic } from './entities/doctor-clinic.entity';
import { ClinicHoliday } from './entities/clinic-holiday.entity';
import { ClinicScopeGuard } from './guards/clinic-scope.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Clinic,
      ClinicMembership,
      DoctorClinic,
      ClinicHoliday,
    ]),
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService, ClinicScopeGuard],
  exports: [ClinicsService, TypeOrmModule, ClinicScopeGuard],
})
export class ClinicsModule {}
