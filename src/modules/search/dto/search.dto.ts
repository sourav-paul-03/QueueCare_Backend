import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDoctorsDto {
  @IsOptional()
  @IsString()
  query?: string; // name or bio keywords

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  specialtyId?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number; // default e.g. 15 km
}
