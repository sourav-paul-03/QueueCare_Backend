import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BreakDto {
  @IsString()
  @IsNotEmpty()
  startTime: string; // HH:mm:ss

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateScheduleDto {
  @IsNumber()
  @IsNotEmpty()
  doctorClinicId: number;

  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @IsNotEmpty()
  startTime: string; // HH:mm:ss

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsOptional()
  @IsNumber()
  slotDuration?: number;

  @IsOptional()
  @IsNumber()
  maxPatients?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakDto)
  breaks?: BreakDto[];
}

export class CreateExceptionDto {
  @IsNumber()
  @IsNotEmpty()
  doctorClinicId: number;

  @IsDateString()
  @IsNotEmpty()
  exceptionDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetSlotsQueryDto {
  @IsNumber()
  @Type(() => Number)
  doctorClinicId: number;

  @IsDateString()
  date: string; // YYYY-MM-DD
}
