import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QueueSession, QueueSessionStatusEnum } from './entities/queue-session.entity';
import { QueueToken, QueueTokenStatusEnum } from './entities/queue-token.entity';
import { QueueEvent } from './entities/queue-event.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { Patient } from '../users/entities/patient.entity';
import { User, UserRoleEnum } from '../users/entities/user.entity';
import { WalkInCheckInDto, CallNextDto, ActionTokenDto, UpdateSessionStatusDto } from './dto/queue.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(QueueSession)
    private readonly sessionRepository: Repository<QueueSession>,
    @InjectRepository(QueueToken)
    private readonly tokenRepository: Repository<QueueToken>,
    @InjectRepository(QueueEvent)
    private readonly eventRepository: Repository<QueueEvent>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async getOrCreateSession(doctorClinicId: number, queueDate: string): Promise<QueueSession> {
    const dc = await this.doctorClinicRepository.findOne({ where: { id: doctorClinicId } });
    if (!dc) throw new NotFoundException('Doctor Clinic not found');

    await this.dataSource.query(
      `INSERT INTO queue_sessions (doctor_clinic_id, queue_date, status, last_token_number, version)
       VALUES (?, ?, 'OPEN', 0, 1)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);`,
      [doctorClinicId, queueDate],
    );

    const [rows] = await this.dataSource.query(
      `SELECT * FROM queue_sessions WHERE id = LAST_INSERT_ID();`,
    );
    return rows[0];
  }

  async getSessionState(doctorClinicId: number, queueDate: string) {
    const session = await this.getOrCreateSession(doctorClinicId, queueDate);

    const tokens = await this.tokenRepository
      .createQueryBuilder('qt')
      .leftJoinAndSelect('qt.appointment', 'appt')
      .leftJoinAndSelect('appt.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'user')
      .where('qt.queueSessionId = :sessionId', { sessionId: session.id })
      .orderBy('qt.priority', 'DESC')
      .addOrderBy('qt.effectiveTime', 'ASC')
      .addOrderBy('qt.tokenNumber', 'ASC')
      .getMany();

    const currentToken = tokens.find((t) => t.id === Number(session.currentTokenId));
    const waitingTokens = tokens.filter((t) => t.status === QueueTokenStatusEnum.WAITING);
    const inConsultationToken = tokens.find((t) => t.status === QueueTokenStatusEnum.IN_CONSULTATION);
    const calledToken = tokens.find((t) => t.status === QueueTokenStatusEnum.CALLED);
    const skippedTokens = tokens.filter((t) => t.status === QueueTokenStatusEnum.SKIPPED);
    const completedTokens = tokens.filter((t) => t.status === QueueTokenStatusEnum.COMPLETED);
    const bookedTokens = tokens.filter((t) => t.status === QueueTokenStatusEnum.BOOKED);

    return {
      session,
      currentToken: currentToken || inConsultationToken || calledToken || null,
      waitingCount: waitingTokens.length,
      waitingTokens,
      inConsultationToken: inConsultationToken || null,
      calledToken: calledToken || null,
      skippedTokens,
      completedCount: completedTokens.length,
      bookedTokens,
      totalTokens: tokens.length,
    };
  }

  async checkInBookedToken(tokenId: number, currentUserId?: number) {
    const token = await this.tokenRepository.findOne({
      where: { id: tokenId },
      relations: ['appointment'],
    });
    if (!token) throw new NotFoundException('Token not found');

    if (token.status !== QueueTokenStatusEnum.BOOKED) {
      throw new BadRequestException(`Cannot check in token currently in status: ${token.status}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();
      // 1. Update Token status to WAITING
      await queryRunner.query(
        `UPDATE queue_tokens
            SET status = 'WAITING', checked_in_at = ?, effective_time = ?
          WHERE id = ?;`,
        [now, now, tokenId],
      );

      // 2. Append event
      await queryRunner.query(
        `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type)
         VALUES (?, 'BOOKED', 'WAITING', 'CHECKED_IN');`,
        [tokenId],
      );

      // 3. Sync Appointment
      if (token.appointmentId) {
        await queryRunner.query(
          `UPDATE appointments SET status = 'CHECKED_IN' WHERE id = ?;`,
          [token.appointmentId],
        );
        await queryRunner.query(
          `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
           VALUES (?, 'CONFIRMED', 'CHECKED_IN', ?, 'Patient checked in');`,
          [token.appointmentId, currentUserId || null],
        );
      }

      // 4. Bump session version
      await queryRunner.query(
        `UPDATE queue_sessions SET version = version + 1 WHERE id = ?;`,
        [token.queueSessionId],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`📥 [Check-In] Token #${token.tokenPrefix}-${token.tokenNumber} checked in (WAITING).`);
      return { success: true, tokenId, status: QueueTokenStatusEnum.WAITING };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async walkInCheckIn(dto: WalkInCheckInDto, currentUserId?: number) {
    const dc = await this.doctorClinicRepository.findOne({ where: { id: dto.doctorClinicId } });
    if (!dc) throw new NotFoundException('Doctor Clinic affiliation not found');

    const today = new Date().toISOString().slice(0, 10);
    const tokenPrefix = dc.tokenPrefix || 'A';
    const now = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get or create session and lock FOR UPDATE
      await queryRunner.query(
        `INSERT INTO queue_sessions (doctor_clinic_id, queue_date, status, last_token_number, version)
         VALUES (?, ?, 'OPEN', 0, 1)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);`,
        [dc.id, today],
      );

      const [sessionRows] = await queryRunner.query(
        `SELECT id FROM queue_sessions WHERE id = LAST_INSERT_ID() FOR UPDATE;`,
      );
      const sessionId = sessionRows[0].id;

      // 2. Resolve or create patient
      let patientId = dto.patientId;
      if (!patientId && (dto.patientName || dto.patientPhone)) {
        const phone = dto.patientPhone || `walkin-${Date.now()}`;
        const name = dto.patientName || 'Walk-in Patient';
        const userRes = await queryRunner.query(
          `INSERT INTO users (full_name, phone, role, is_active)
           VALUES (?, ?, 'PATIENT', true)
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);`,
          [name, phone],
        );
        const userId = userRes.insertId || userRes[0]?.id;
        const patRes = await queryRunner.query(
          `INSERT INTO patients (user_id) VALUES (?)
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);`,
          [userId],
        );
        patientId = patRes.insertId;
      }

      // 3. Atomically bump token counter
      await queryRunner.query(
        `UPDATE queue_sessions
            SET last_token_number = LAST_INSERT_ID(last_token_number + 1),
                version = version + 1
          WHERE id = ?;`,
        [sessionId],
      );
      const [counterRows] = await queryRunner.query(`SELECT LAST_INSERT_ID() AS token_number;`);
      const tokenNumber = counterRows[0].token_number;

      // 4. Insert walk-in token directly into WAITING
      const priority = dto.priority || 0;
      const tokenRes = await queryRunner.query(
        `INSERT INTO queue_tokens (queue_session_id, token_number, token_prefix, priority, effective_time, status, is_walk_in, checked_in_at)
         VALUES (?, ?, ?, ?, ?, 'WAITING', true, ?);`,
        [sessionId, tokenNumber, tokenPrefix, priority, now, now],
      );
      const tokenId = tokenRes.insertId;

      // 5. Append events: CREATED + CHECKED_IN
      await queryRunner.query(
        `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type)
         VALUES (?, NULL, 'BOOKED', 'CREATED'), (?, 'BOOKED', 'WAITING', 'CHECKED_IN');`,
        [tokenId, tokenId],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`🚶‍♂️ [Walk-In] Token #${tokenPrefix}-${tokenNumber} generated with status WAITING.`);
      return {
        id: tokenId,
        tokenNumber,
        tokenPrefix,
        tokenDisplay: `${tokenPrefix}-${tokenNumber}`,
        status: QueueTokenStatusEnum.WAITING,
        isWalkIn: true,
        priority,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async callNext(dto: CallNextDto, currentUserId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock queue_sessions FOR UPDATE
      const [sessionRows] = await queryRunner.query(
        `SELECT id, version, status, current_token_id
           FROM queue_sessions
          WHERE doctor_clinic_id = ? AND queue_date = ?
            FOR UPDATE;`,
        [dto.doctorClinicId, dto.date],
      );

      if (!sessionRows || sessionRows.length === 0) {
        throw new NotFoundException('Queue session not found for this date');
      }

      const session = sessionRows[0];

      if (session.status === QueueSessionStatusEnum.PAUSED) {
        throw new BadRequestException('Queue session is currently PAUSED. Please resume queue to call next patient.');
      }

      // Optimistic concurrency check
      if (dto.expectedVersion !== undefined && dto.expectedVersion !== session.version) {
        throw new ConflictException(
          `Queue version mismatch (client: ${dto.expectedVersion}, server: ${session.version}). Please refresh state.`,
        );
      }

      // 2. Pick next waiting token: Priority DESC, effective_time ASC, token_number ASC
      const [waitingRows] = await queryRunner.query(
        `SELECT id, token_number, token_prefix, appointment_id, status
           FROM queue_tokens
          WHERE queue_session_id = ? AND status = 'WAITING'
          ORDER BY priority DESC, effective_time ASC, token_number ASC
          LIMIT 1;`,
        [session.id],
      );

      if (!waitingRows || waitingRows.length === 0) {
        await queryRunner.commitTransaction();
        return { message: 'No waiting patients in queue', calledToken: null };
      }

      const nextToken = waitingRows[0];
      const now = new Date();

      // 3. Transition Token WAITING -> CALLED
      await queryRunner.query(
        `UPDATE queue_tokens
            SET status = 'CALLED', called_at = ?
          WHERE id = ?;`,
        [now, nextToken.id],
      );

      // 4. Update session current_token_id & bump version
      await queryRunner.query(
        `UPDATE queue_sessions
            SET current_token_id = ?, version = version + 1
          WHERE id = ?;`,
        [nextToken.id, session.id],
      );

      // 5. Append queue_events log
      await queryRunner.query(
        `INSERT INTO queue_events (queue_token_id, from_status, to_status, event_type)
         VALUES (?, 'WAITING', 'CALLED', 'CALLED');`,
        [nextToken.id],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`📢 [Call Next] Token #${nextToken.tokenPrefix}-${nextToken.tokenNumber} is CALLED!`);

      return {
        success: true,
        sessionVersion: session.version + 1,
        calledToken: {
          id: nextToken.id,
          tokenNumber: nextToken.tokenNumber,
          tokenPrefix: nextToken.tokenPrefix,
          tokenDisplay: `${nextToken.tokenPrefix}-${nextToken.tokenNumber}`,
          status: QueueTokenStatusEnum.CALLED,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async startConsultation(dto: ActionTokenDto, currentUserId?: number) {
    const token = await this.tokenRepository.findOne({
      where: { id: dto.tokenId },
      relations: ['appointment'],
    });
    if (!token) throw new NotFoundException('Token not found');

    if (token.status !== QueueTokenStatusEnum.CALLED) {
      throw new BadRequestException(`Cannot start consultation for token in status: ${token.status}`);
    }

    const now = new Date();
    token.status = QueueTokenStatusEnum.IN_CONSULTATION;
    token.startedAt = now;
    await this.tokenRepository.save(token);

    await this.eventRepository.save(
      this.eventRepository.create({
        queueTokenId: token.id,
        fromStatus: 'CALLED',
        toStatus: 'IN_CONSULTATION',
        eventType: 'STARTED',
      }),
    );

    if (token.appointmentId) {
      await this.dataSource.query(
        `UPDATE appointments SET status = 'IN_PROGRESS' WHERE id = ?;`,
        [token.appointmentId],
      );
      await this.dataSource.query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, 'CHECKED_IN', 'IN_PROGRESS', ?, 'Consultation started');`,
        [token.appointmentId, currentUserId || null],
      );
    }

    await this.sessionRepository.increment({ id: token.queueSessionId }, 'version', 1);

    this.logger.log(`🩺 [Consultation Started] Token #${token.tokenPrefix}-${token.tokenNumber}`);
    return { success: true, tokenId: token.id, status: QueueTokenStatusEnum.IN_CONSULTATION };
  }

  async completeConsultation(dto: ActionTokenDto, currentUserId?: number) {
    const token = await this.tokenRepository.findOne({
      where: { id: dto.tokenId },
      relations: ['appointment'],
    });
    if (!token) throw new NotFoundException('Token not found');

    const fromStatus = token.status;
    const now = new Date();
    token.status = QueueTokenStatusEnum.COMPLETED;
    token.completedAt = now;
    await this.tokenRepository.save(token);

    await this.eventRepository.save(
      this.eventRepository.create({
        queueTokenId: token.id,
        fromStatus,
        toStatus: 'COMPLETED',
        eventType: 'COMPLETED',
      }),
    );

    if (token.appointmentId) {
      await this.dataSource.query(
        `UPDATE appointments SET status = 'COMPLETED' WHERE id = ?;`,
        [token.appointmentId],
      );
      await this.dataSource.query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, 'IN_PROGRESS', 'COMPLETED', ?, 'Consultation completed');`,
        [token.appointmentId, currentUserId || null],
      );
    }

    // Clear current token from session if it was this one
    await this.dataSource.query(
      `UPDATE queue_sessions
          SET current_token_id = CASE WHEN current_token_id = ? THEN NULL ELSE current_token_id END,
              version = version + 1
        WHERE id = ?;`,
      [token.id, token.queueSessionId],
    );

    this.logger.log(`🏁 [Consultation Completed] Token #${token.tokenPrefix}-${token.tokenNumber}`);
    return { success: true, tokenId: token.id, status: QueueTokenStatusEnum.COMPLETED };
  }

  async skipToken(dto: ActionTokenDto, currentUserId?: number) {
    const token = await this.tokenRepository.findOne({ where: { id: dto.tokenId } });
    if (!token) throw new NotFoundException('Token not found');

    const fromStatus = token.status;
    token.status = QueueTokenStatusEnum.SKIPPED;
    await this.tokenRepository.save(token);

    await this.eventRepository.save(
      this.eventRepository.create({
        queueTokenId: token.id,
        fromStatus,
        toStatus: 'SKIPPED',
        eventType: 'SKIPPED',
      }),
    );

    await this.sessionRepository.increment({ id: token.queueSessionId }, 'version', 1);

    this.logger.log(`⏩ [Skipped] Token #${token.tokenPrefix}-${token.tokenNumber}`);
    return { success: true, tokenId: token.id, status: QueueTokenStatusEnum.SKIPPED };
  }

  async reinstateToken(dto: ActionTokenDto, currentUserId?: number) {
    const token = await this.tokenRepository.findOne({ where: { id: dto.tokenId } });
    if (!token) throw new NotFoundException('Token not found');

    if (token.status !== QueueTokenStatusEnum.SKIPPED) {
      throw new BadRequestException('Only skipped tokens can be reinstated');
    }

    token.status = QueueTokenStatusEnum.WAITING;
    token.effectiveTime = new Date(); // Re-queued with current effective time
    await this.tokenRepository.save(token);

    await this.eventRepository.save(
      this.eventRepository.create({
        queueTokenId: token.id,
        fromStatus: 'SKIPPED',
        toStatus: 'WAITING',
        eventType: 'REINSTATED',
      }),
    );

    await this.sessionRepository.increment({ id: token.queueSessionId }, 'version', 1);

    this.logger.log(`♻️ [Reinstated] Token #${token.tokenPrefix}-${token.tokenNumber} back to WAITING.`);
    return { success: true, tokenId: token.id, status: QueueTokenStatusEnum.WAITING };
  }

  async noShowToken(dto: ActionTokenDto, currentUserId?: number) {
    const token = await this.tokenRepository.findOne({ where: { id: dto.tokenId } });
    if (!token) throw new NotFoundException('Token not found');

    const fromStatus = token.status;
    token.status = QueueTokenStatusEnum.NO_SHOW;
    await this.tokenRepository.save(token);

    await this.eventRepository.save(
      this.eventRepository.create({
        queueTokenId: token.id,
        fromStatus,
        toStatus: 'NO_SHOW',
        eventType: 'NO_SHOW',
      }),
    );

    if (token.appointmentId) {
      await this.dataSource.query(
        `UPDATE appointments SET status = 'NO_SHOW' WHERE id = ?;`,
        [token.appointmentId],
      );
      await this.dataSource.query(
        `INSERT INTO appointment_status_history (appointment_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, ?, 'NO_SHOW', ?, 'Patient no show');`,
        [token.appointmentId, fromStatus, currentUserId || null],
      );
    }

    await this.sessionRepository.increment({ id: token.queueSessionId }, 'version', 1);

    this.logger.log(`⚠️ [No Show] Token #${token.tokenPrefix}-${token.tokenNumber}`);
    return { success: true, tokenId: token.id, status: QueueTokenStatusEnum.NO_SHOW };
  }

  async recallToken(dto: ActionTokenDto) {
    const token = await this.tokenRepository.findOne({ where: { id: dto.tokenId } });
    if (!token) throw new NotFoundException('Token not found');

    await this.eventRepository.save(
      this.eventRepository.create({
        queueTokenId: token.id,
        fromStatus: token.status,
        toStatus: token.status,
        eventType: 'RECALLED',
      }),
    );

    this.logger.log(`🔔 [Recalled] Token #${token.tokenPrefix}-${token.tokenNumber}`);
    return {
      success: true,
      tokenId: token.id,
      tokenDisplay: `${token.tokenPrefix}-${token.tokenNumber}`,
      status: token.status,
    };
  }

  async updateSessionStatus(dto: UpdateSessionStatusDto) {
    const session = await this.getOrCreateSession(dto.doctorClinicId, dto.date);
    await this.sessionRepository.update(
      { id: session.id },
      { status: dto.status, version: session.version + 1 },
    );
    return { success: true, doctorClinicId: dto.doctorClinicId, status: dto.status };
  }

  async getTokenEvents(tokenId: number) {
    return this.eventRepository.find({
      where: { queueTokenId: tokenId },
      order: { createdAt: 'ASC' },
    });
  }
}
