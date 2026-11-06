import { IsNumber, IsNotEmpty, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsNumber()
  @IsNotEmpty()
  appointmentId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
