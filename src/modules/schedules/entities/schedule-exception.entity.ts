import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DoctorClinic } from '../../clinics/entities/doctor-clinic.entity';

@Entity('schedule_exceptions')
@Index('idx_exception_lookup', ['doctorClinicId', 'exceptionDate'])
export class ScheduleException {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_clinic_id', type: 'bigint' })
  doctorClinicId: number;

  @ManyToOne(() => DoctorClinic)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ name: 'exception_date', type: 'date' })
  exceptionDate: string; // YYYY-MM-DD

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string;

  @Column({ name: 'is_available', type: 'boolean', default: false })
  isAvailable: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;
}
