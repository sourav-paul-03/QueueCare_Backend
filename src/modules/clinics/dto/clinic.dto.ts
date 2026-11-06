import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail, IsBoolean, IsDateString } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddClinicMembershipDto {
  @IsNumber()
  @IsNotEmpty()
  clinicId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  role: string; // CLINIC_ADMIN, RECEPTIONIST, STAFF
}

export class LinkDoctorClinicDto {
  @IsNumber()
  @IsNotEmpty()
  doctorId: number;

  @IsNumber()
  @IsNotEmpty()
  clinicId: number;

  @IsOptional()
  @IsNumber()
  consultationFee?: number;

  @IsOptional()
  @IsString()
  tokenPrefix?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;
}

export class AddClinicHolidayDto {
  @IsNumber()
  @IsNotEmpty()
  clinicId: number;

  @IsDateString()
  @IsNotEmpty()
  holidayDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  reason?: string;
}
