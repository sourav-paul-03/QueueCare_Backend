import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('clinics')
@Index('idx_clinics_city', ['city'])
@Index('idx_clinics_lat_lng', ['latitude', 'longitude'])
export class Clinic {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Dhaka' })
  timezone: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
