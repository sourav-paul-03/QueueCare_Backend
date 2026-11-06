import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DoctorSchedule } from './doctor-schedule.entity';

@Entity('schedule_breaks')
export class ScheduleBreak {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'doctor_schedule_id', type: 'bigint' })
  doctorScheduleId: number;

  @ManyToOne(() => DoctorSchedule, (ds) => ds.breaks)
  @JoinColumn({ name: 'doctor_schedule_id' })
  doctorSchedule: DoctorSchedule;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  description: string;
}
