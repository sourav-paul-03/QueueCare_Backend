import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'appointment_id', type: 'bigint', unique: true })
  appointmentId: number;

  @OneToOne(() => Appointment)
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ type: 'smallint' })
  rating: number; // 1 to 5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
