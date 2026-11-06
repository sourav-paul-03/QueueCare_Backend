import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review } from './entities/review.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Patient } from '../users/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Appointment, Patient])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService, TypeOrmModule],
})
export class ReviewsModule {}
