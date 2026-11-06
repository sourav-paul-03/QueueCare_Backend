import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index('idx_audit_user', ['userId'])
@Index('idx_audit_clinic', ['clinicId'])
@Index('idx_audit_action', ['action'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number;

  @Column({ name: 'clinic_id', type: 'bigint', nullable: true })
  clinicId: number;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 50, nullable: true })
  entityId: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
