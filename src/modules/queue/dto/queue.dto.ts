import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { QueueSessionStatusEnum } from '../entities/queue-session.entity';

export class WalkInCheckInDto {
  @IsNumber()
  @IsNotEmpty()
  doctorClinicId: number;

  @IsOptional()
  @IsNumber()
  patientId?: number; // Optional if existing patient; or auto-created

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  patientPhone?: string;

  @IsOptional()
  @IsNumber()
  priority?: number; // 0 normal, 10 emergency
}

export class CheckInDto {
  @IsNumber()
  @IsNotEmpty()
  tokenId: number;
}

export class CallNextDto {
  @IsNumber()
  @IsNotEmpty()
  doctorClinicId: number;

  @IsDateString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsNumber()
  @IsNotEmpty()
  expectedVersion: number; // Optimistic locking version
}

export class ActionTokenDto {
  @IsNumber()
  @IsNotEmpty()
  tokenId: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateSessionStatusDto {
  @IsNumber()
  @IsNotEmpty()
  doctorClinicId: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsEnum(QueueSessionStatusEnum)
  status: QueueSessionStatusEnum;
}
