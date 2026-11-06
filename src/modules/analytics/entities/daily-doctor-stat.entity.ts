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

@Entity('daily_doctor_stats')
@Unique('uq_doctor_stat_date', ['doctorClinicId', 'statDate'])
export class DailyDoctorStat {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_clinic_id', type: 'bigint' })
  doctorClinicId: number;

  @ManyToOne(() => DoctorClinic)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ name: 'stat_date', type: 'date' })
  statDate: string; // YYYY-MM-DD

  @Column({ name: 'total_tokens', type: 'int', default: 0 })
  totalTokens: number;

  @Column({ name: 'completed_count', type: 'int', default: 0 })
  completedCount: number;

  @Column({ name: 'cancelled_count', type: 'int', default: 0 })
  cancelledCount: number;

  @Column({ name: 'no_show_count', type: 'int', default: 0 })
  noShowCount: number;

  @Column({ name: 'avg_wait_minutes', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  avgWaitMinutes: number;

  @Column({ name: 'avg_consult_minutes', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  avgConsultMinutes: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
