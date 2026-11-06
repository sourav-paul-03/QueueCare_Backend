import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QueueToken } from '../../queue/entities/queue-token.entity';

@Entity('wait_estimate_logs')
@Index('idx_wait_logs_token', ['queueTokenId'])
export class WaitEstimateLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'queue_token_id', type: 'bigint' })
  queueTokenId: number;

  @ManyToOne(() => QueueToken)
  @JoinColumn({ name: 'queue_token_id' })
  queueToken: QueueToken;

  @Column({ name: 'estimated_wait_minutes', type: 'int' })
  estimatedWaitMinutes: number;

  @Column({ name: 'actual_wait_minutes', type: 'int', nullable: true })
  actualWaitMinutes: number;

  @Column({ name: 'model_type', type: 'varchar', length: 20, default: 'HEURISTIC' })
  modelType: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
