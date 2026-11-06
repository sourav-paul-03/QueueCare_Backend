import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QueueToken } from './queue-token.entity';

@Entity('queue_events')
@Index('idx_events_token', ['queueTokenId', 'createdAt'])
export class QueueEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'queue_token_id', type: 'bigint' })
  queueTokenId: number;

  @ManyToOne(() => QueueToken)
  @JoinColumn({ name: 'queue_token_id' })
  queueToken: QueueToken;

  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true })
  fromStatus: string;

  @Column({ name: 'to_status', type: 'varchar', length: 30 })
  toStatus: string;

  @Column({ name: 'event_type', type: 'varchar', length: 30 })
  eventType: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
