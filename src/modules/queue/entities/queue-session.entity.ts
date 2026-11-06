import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { DoctorClinic } from '../../clinics/entities/doctor-clinic.entity';

export enum QueueSessionStatusEnum {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

@Entity('queue_sessions')
@Unique('uq_session_date', ['doctorClinicId', 'queueDate'])
export class QueueSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_clinic_id', type: 'bigint' })
  doctorClinicId: number;

  @ManyToOne(() => DoctorClinic)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ name: 'queue_date', type: 'date' })
  queueDate: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 20, default: QueueSessionStatusEnum.OPEN })
  status: string;

  @Column({ name: 'last_token_number', type: 'int', default: 0 })
  lastTokenNumber: number;

  @Column({ name: 'current_token_id', type: 'bigint', nullable: true })
  currentTokenId: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
