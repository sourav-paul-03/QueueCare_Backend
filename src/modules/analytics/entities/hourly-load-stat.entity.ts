import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { DoctorClinic } from '../../clinics/entities/doctor-clinic.entity';

@Entity('hourly_load_stats')
@Unique('uq_hourly_stat', ['doctorClinicId', 'statDate', 'hourOfDay'])
export class HourlyLoadStat {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_clinic_id', type: 'bigint' })
  doctorClinicId: number;

  @ManyToOne(() => DoctorClinic)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ name: 'stat_date', type: 'date' })
  statDate: string; // YYYY-MM-DD

  @Column({ name: 'hour_of_day', type: 'smallint' })
  hourOfDay: number; // 0 to 23

  @Column({ name: 'check_in_count', type: 'int', default: 0 })
  checkInCount: number;

  @Column({ name: 'called_count', type: 'int', default: 0 })
  calledCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
