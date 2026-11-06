import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { QueueSession } from './queue-session.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum QueueTokenStatusEnum {
  BOOKED = 'BOOKED',
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

@Entity('queue_tokens')
@Unique('uq_session_token', ['queueSessionId', 'tokenNumber'])
@Index('idx_token_status', ['queueSessionId', 'status', 'priority', 'effectiveTime'])
export class QueueToken {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'queue_session_id', type: 'bigint' })
  queueSessionId: number;

  @ManyToOne(() => QueueSession)
  @JoinColumn({ name: 'queue_session_id' })
  queueSession: QueueSession;

  @Column({ name: 'appointment_id', type: 'bigint', nullable: true })
  appointmentId: number;

  @ManyToOne(() => Appointment)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'token_number', type: 'int' })
  tokenNumber: number;

  @Column({ name: 'token_prefix', type: 'varchar', length: 10, default: 'A' })
  tokenPrefix: string;

  @Column({ type: 'int', default: 0 })
  priority: number; // e.g. 0 = Normal, 10 = Emergency

  @Column({ name: 'effective_time', type: 'datetime', precision: 3, nullable: true })
  effectiveTime: Date;

  @Column({ type: 'varchar', length: 30, default: QueueTokenStatusEnum.BOOKED })
  status: string;

  @Column({ name: 'is_walk_in', type: 'boolean', default: false })
  isWalkIn: boolean;

  @Column({ name: 'checked_in_at', type: 'datetime', precision: 3, nullable: true })
  checkedInAt: Date;

  @Column({ name: 'called_at', type: 'datetime', precision: 3, nullable: true })
  calledAt: Date;

  @Column({ name: 'started_at', type: 'datetime', precision: 3, nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', precision: 3, nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
