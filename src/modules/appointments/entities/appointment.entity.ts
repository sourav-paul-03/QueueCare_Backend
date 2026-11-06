import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DoctorClinic } from '../../clinics/entities/doctor-clinic.entity';
import { Patient } from '../../users/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

export enum AppointmentStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('appointments')
@Index('idx_appointments_lookup', ['doctorClinicId', 'startAt', 'status'])
@Index('idx_appointments_patient', ['patientId', 'startAt'])
export class Appointment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_clinic_id', type: 'bigint' })
  doctorClinicId: number;

  @ManyToOne(() => DoctorClinic)
  @JoinColumn({ name: 'doctor_clinic_id' })
  doctorClinic: DoctorClinic;

  @Column({ name: 'patient_id', type: 'bigint' })
  patientId: number;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'booked_by_user_id', type: 'bigint' })
  bookedByUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'booked_by_user_id' })
  bookedByUser: User;

  @Column({ name: 'start_at', type: 'datetime', precision: 3 })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime', precision: 3 })
  endAt: Date;

  @Column({ type: 'varchar', length: 30, default: AppointmentStatusEnum.CONFIRMED })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, unique: true, nullable: true })
  idempotencyKey: string;

  // Generated virtual column in MySQL (readonly in TypeORM)
  @Column({
    name: 'slot_lock',
    type: 'tinyint',
    insert: false,
    update: false,
    nullable: true,
  })
  slotLock: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
