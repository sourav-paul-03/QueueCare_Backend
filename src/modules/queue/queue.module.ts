import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { QueueSession } from './entities/queue-session.entity';
import { QueueToken } from './entities/queue-token.entity';
import { QueueEvent } from './entities/queue-event.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { Patient } from '../users/entities/patient.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QueueSession,
      QueueToken,
      QueueEvent,
      DoctorClinic,
      Patient,
      User,
    ]),
  ],
  controllers: [QueueController],
  providers: [QueueService, QueueGateway],
  exports: [QueueService, QueueGateway, TypeOrmModule],
})
export class QueueModule {}
