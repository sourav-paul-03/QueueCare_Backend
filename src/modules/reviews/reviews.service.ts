import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Appointment, AppointmentStatusEnum } from '../appointments/entities/appointment.entity';
import { Patient } from '../users/entities/patient.entity';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async submitReview(dto: CreateReviewDto, currentUserId: number): Promise<Review> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: dto.appointmentId },
      relations: ['patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    // Rule: Review rejected on non-completed appointment
    if (appointment.status !== AppointmentStatusEnum.COMPLETED) {
      throw new BadRequestException('Reviews can only be submitted for completed consultations.');
    }

    // Verify patient identity
    const patient = await this.patientRepository.findOne({ where: { userId: currentUserId } });
    if (!patient || patient.id !== appointment.patientId) {
      throw new ForbiddenException('You can only review consultations you attended.');
    }

    // Check duplicate
    const existing = await this.reviewRepository.findOne({ where: { appointmentId: dto.appointmentId } });
    if (existing) {
      throw new ConflictException('A review has already been submitted for this consultation.');
    }

    const review = this.reviewRepository.create({
      appointmentId: dto.appointmentId,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.reviewRepository.save(review);
  }

  async getDoctorReviews(doctorId: number) {
    return this.reviewRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.appointment', 'appt')
      .innerJoinAndSelect('appt.doctorClinic', 'dc')
      .innerJoinAndSelect('appt.patient', 'patient')
      .innerJoinAndSelect('patient.user', 'patientUser')
      .where('dc.doctorId = :doctorId', { doctorId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }
}
