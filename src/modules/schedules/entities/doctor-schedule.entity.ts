import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { DoctorClinic } from '../../clinics/entities/doctor-clinic.entity';
import { ScheduleBreak } from './schedule-break.entity';

@Entity('doctor_schedules')
@Index('idx_schedule_lookup', ['doctorClinicId', 'dayOfWeek', 'isActive'])
export class DoctorSchedule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_clinic_id', type: 'bigint' })
  doctorClinicId: number;

  @ManyToOne(() => DoctorClinic)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  @Column({ name: 'start_time', type: 'time' })
  startTime: string; // HH:mm:ss

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'slot_duration', type: 'int', default: 15 })
  slotDuration: number; // minutes

  @Column({ name: 'max_patients', type: 'int', default: 30 })
  maxPatients: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ScheduleBreak, (sb) => sb.doctorSchedule, { cascade: true })
  breaks: ScheduleBreak[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
