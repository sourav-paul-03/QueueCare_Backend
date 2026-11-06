import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class BookAppointmentDto {
  @IsNumber()
  @IsNotEmpty()
  doctorClinicId: number;

  @IsOptional()
  @IsNumber()
  patientId?: number; // If booked by staff for a patient; otherwise taken from authenticated user

  @IsDateString()
  @IsNotEmpty()
  startAt: string; // ISO datetime UTC

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  newStartAt: string;

  @IsOptional()
  @IsDateString()
  newEndAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
