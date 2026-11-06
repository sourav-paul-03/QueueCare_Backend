import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Appointment, AppointmentStatusEnum } from './entities/appointment.entity';
import { AppointmentStatusHistory } from './entities/appointment-status-history.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { Patient } from '../users/entities/patient.entity';
import { BookAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto } from './dto/appointment.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentStatusHistory)
    private readonly historyRepository: Repository<AppointmentStatusHistory>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async bookAppointment(dto: BookAppointmentDto, currentUserId: number) {
    // 1. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.appointmentRepository.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
        relations: ['doctorClinic', 'doctorClinic.doctor', 'doctorClinic.doctor.user', 'doctorClinic.clinic'],
      });
      if (existing) {
        this.logger.log(`🔁 [Idempotency] Returning existing appointment ${existing.id}`);
        return existing;
      }
    }

    // 2. Resolve Patient ID
    let patientId = dto.patientId;
    if (!patientId) {
      let patient = await this.patientRepository.findOne({ where: { userId: currentUserId } });
      if (!patient) {
        patient = await this.patientRepository.save(this.patientRepository.create({ userId: currentUserId }));
      }
      patientId = patient.id;
    }

    // 3. Resolve Doctor Clinic
    const dc = await this.doctorClinicRepository.findOne({
      where: { id: dto.doctorClinicId },
      relations: ['clinic'],
    });
    if (!dc || !dc.isActive) {
      throw new NotFoundException('Doctor Clinic affiliation not found or inactive');
    }

    const startAt = new Date(dto.startAt);
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('Invalid start time format');
    }

    const endAt = dto.endAt ? new Date(dto.endAt) : new Date(startAt.getTime() + 15 * 60 * 1000);
    const queueDate = startAt.toISOString().slice(0, 10); // YYYY-MM-DD
    const tokenPrefix = dc.tokenPrefix || 'A';

    // 4. Atomic Transaction with strict lock order: queue_sessions -> appointments -> queue_tokens
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step A: Lock Target 1 -> queue_sessions get-or-create and lock FOR UPDATE
      await queryRunner.query(
        `INSERT INTO queue_sessions (doctor_clinic_id, queue_date, status, last_token_number, version)
         VALUES (?, ?, 'OPEN', 0, 1)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);`,
        [dc.id, queueDate],
      );

      const [sessionRows] = await queryRunner.query(
        `SELECT id, last_token_number, version FROM queue_sessions WHERE id = LAST_INSERT_ID() FOR UPDATE;`,
      );
      const sessionId = sessionRows[0].id;

      // Step B: Lock Target 2 -> Insert Appointment (Protected by generated slot_lock & uq_active_slot)
      let appointmentId: number;
      try {
        const insertRes = await queryRunner.query(
          `INSERT INTO appointments (doctor_clinic_id, patient_id, booked_by_user_id, start_at, end_at, status, idempotency_key, notes)
           VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, ?);`,
          [
            dc.id,
            patientId,
            currentUserId,
            startAt,
            endAt,
            dto.idempotencyKey || null,
            dto.notes || null,
          ],
        );
        appointmentId = insertRes.insertId;
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw new ConflictException(
            'This slot was just booked by another patient. Please choose an alternate available time.',
          );
        }
        throw err;
      }

      // Step C: Atomically Increment Token Counter on queue_sessions
      await queryRunner.query(
        `UPDATE queue_sessions
            SET last_token_number = LAST_INSERT_ID(last_token_number + 1),
                version = version + 1
          WHERE id = ?;`,
        [sessionId],
      );

      const [counterRows] = await queryRunner.query(`SELECT LAST_INSERT_ID() AS token_number;`);
      const tokenNumber = counterRows[0].token_number;

      // Step D: Lock Target 3 -> Insert Queue Token
      const tokenRes = await queryRunner.query(
        `INSERT INTO queue_tokens (queue_session_id, appointment_id, token_number, token_prefix, priority, effective_time, status, is_walk_in)
         VALUES (?, ?, ?, ?, 0, ?, 'BOOKED', false);`,
        [sessionId, appointmentId, tokenNumber, tokenPrefix, startAt],
      );
      const tokenId = tokenRes.insertId;

      // Step E: Insert Append-Only queue_events log
      await queryRunner.query(
        `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type)
         VALUES (?, NULL, 'BOOKED', 'CREATED');`,
        [tokenId],
      );

      // Step F: Insert Append-Only appointment_status_history
      await queryRunner.query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, NULL, 'CONFIRMED', ?, 'Initial Booking');`,
        [appointmentId, currentUserId],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`🎟️ [Booking Confirmed] Appointment #${appointmentId} -> Token ${tokenPrefix}-${tokenNumber}`);

      return {
        id: appointmentId,
        doctorClinicId: dc.id,
        patientId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: AppointmentStatusEnum.CONFIRMED,
        token: {
          id: tokenId,
          tokenNumber,
          tokenPrefix,
          tokenDisplay: `${tokenPrefix}-${tokenNumber}`,
          status: 'BOOKED',
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelAppointment(appointmentId: number, dto: CancelAppointmentDto, currentUserId: number) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.status === AppointmentStatusEnum.CANCELLED) {
      return appointment;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromStatus = appointment.status;
      // 1. Update Appointment -> slot_lock becomes NULL automatically in MySQL!
      await queryRunner.query(
        `UPDATE appointments SET status = 'CANCELLED' WHERE id = ?;`,
        [appointmentId],
      );

      // 2. Update Token and write event
      const [tokenRows] = await queryRunner.query(
        `SELECT id, status FROM queue_tokens WHERE appointment_id = ?;`,
        [appointmentId],
      );

      if (tokenRows.length > 0) {
        const token = tokenRows[0];
        await queryRunner.query(
          `UPDATE queue_tokens SET status = 'CANCELLED' WHERE id = ?;`,
          [token.id],
        );
        await queryRunner.query(
          `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type)
           VALUES (?, ?, 'CANCELLED', 'CANCELLED');`,
          [token.id, token.status],
        );
      }

      // 3. Status History
      await queryRunner.query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, ?, 'CANCELLED', ?, ?);`,
        [appointmentId, fromStatus, currentUserId, dto.reason || 'User cancelled'],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`❌ [Cancelled] Appointment #${appointmentId} cancelled. Slot released.`);
      return { id: appointmentId, status: AppointmentStatusEnum.CANCELLED, message: 'Appointment cancelled and slot freed.' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async rescheduleAppointment(appointmentId: number, dto: RescheduleAppointmentDto, currentUserId: number) {
    const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const newStartAt = new Date(dto.newStartAt);
    const newEndAt = dto.newEndAt ? new Date(dto.newEndAt) : new Date(newStartAt.getTime() + 15 * 60 * 1000);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      try {
        await queryRunner.query(
          `UPDATE appointments SET start_at = ?, end_at = ? WHERE id = ?;`,
          [newStartAt, newEndAt, appointmentId],
        );
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw new ConflictException('New selected slot is already booked. Please choose another.');
        }
        throw err;
      }

      // Update effective_time on token
      await queryRunner.query(
        `UPDATE queue_tokens SET effective_time = ? WHERE appointment_id = ?;`,
        [newStartAt, appointmentId],
      );

      await queryRunner.query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, ?, ?, ?, ?);`,
        [appointmentId, appointment.status, appointment.status, currentUserId, dto.reason || 'Rescheduled'],
      );

      await queryRunner.commitTransaction();

      return {
        id: appointmentId,
        startAt: newStartAt.toISOString(),
        endAt: newEndAt.toISOString(),
        status: appointment.status,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyAppointments(currentUserId: number) {
    const patient = await this.patientRepository.findOne({ where: { userId: currentUserId } });
    if (!patient) return [];

    return this.appointmentRepository.find({
      where: { patientId: patient.id },
      relations: ['doctorClinic', 'doctorClinic.doctor', 'doctorClinic.doctor.user', 'doctorClinic.clinic'],
      order: { startAt: 'DESC' },
    });
  }

  async getDoctorClinicAppointments(doctorClinicId: number, date?: string) {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.patient', 'patient')
      .innerJoinAndSelect('patient.user', 'patientUser')
      .where('a.doctorClinicId = :doctorClinicId', { doctorClinicId });

    if (date) {
      qb.andWhere('DATE(a.startAt) = :date', { date });
    }

    qb.orderBy('a.startAt', 'ASC');
    return qb.getMany();
  }

  async getAppointmentHistory(appointmentId: number) {
    return this.historyRepository.find({
      where: { appointmentId },
      relations: ['changedByUser'],
      order: { createdAt: 'ASC' },
    });
  }
}
