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
import { User } from '../../users/entities/user.entity';

@Entity('clinic_memberships')
@Unique('uq_clinic_user', ['clinicId', 'userId'])
export class ClinicMembership {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 30 })
  role: string; // CLINIC_ADMIN, RECEPTIONIST, STAFF

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
