import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { AppointmentStatusHistory } from './entities/appointment-status-history.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { Patient } from '../users/entities/patient.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentStatusHistory,
      DoctorClinic,
      Patient,
    ]),
    AuditModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService, TypeOrmModule],
})
export class AppointmentsModule {}
