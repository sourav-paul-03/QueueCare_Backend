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
import { Doctor } from '../../users/entities/doctor.entity';
import { Clinic } from './clinic.entity';

@Entity('doctor_clinics')
@Unique('uq_doctor_clinic', ['doctorId', 'clinicId'])
export class DoctorClinic {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_id', type: 'bigint' })
  doctorId: number;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'clinic_id', type: 'bigint' })
  clinicId: number;

  @ManyToOne(() => Clinic)
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic;

  @Column({ name: 'consultation_fee', type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  consultationFee: number;

  @Column({ name: 'token_prefix', type: 'varchar', length: 10, default: 'A' })
  tokenPrefix: string;

  @Column({ name: 'room_number', type: 'varchar', length: 50, nullable: true })
  roomNumber: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
