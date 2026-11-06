import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Specialty } from './specialty.entity';

@Entity('doctor_specialties')
export class DoctorSpecialty {
  @PrimaryColumn({ name: 'doctor_id', type: 'bigint' })
  doctorId: number;

  @PrimaryColumn({ name: 'specialty_id', type: 'bigint' })
  specialtyId: number;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => Specialty)
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty;
}
