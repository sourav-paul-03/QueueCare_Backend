import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Clinic } from './clinic.entity';

@Entity('clinic_holidays')
@Unique('uq_clinic_holiday', ['clinicId', 'holidayDate'])
export class ClinicHoliday {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ name: 'holiday_date', type: 'date' })
  holidayDate: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
