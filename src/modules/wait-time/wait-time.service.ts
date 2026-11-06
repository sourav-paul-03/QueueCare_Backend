import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WaitEstimateLog } from './entities/wait-estimate-log.entity';
import { QueueToken, QueueTokenStatusEnum } from '../queue/entities/queue-token.entity';
import { DailyDoctorStat } from '../analytics/entities/daily-doctor-stat.entity';

@Injectable()
export class WaitTimeService {
  private readonly logger = new Logger(WaitTimeService.name);

  constructor(
    @InjectRepository(WaitEstimateLog)
    private readonly logRepository: Repository<WaitEstimateLog>,
    @InjectRepository(QueueToken)
    private readonly tokenRepository: Repository<QueueToken>,
    @InjectRepository(DailyDoctorStat)
    private readonly dailyStatsRepository: Repository<DailyDoctorStat>,
    private readonly dataSource: DataSource,
  ) {}

  async calculateWaitTime(tokenId: number) {
    const token = await this.tokenRepository.findOne({
      where: { id: tokenId },
      relations: ['queueSession'],
    });
    if (!token) throw new NotFoundException('Token not found');

    if (token.status === QueueTokenStatusEnum.IN_CONSULTATION) {
      return {
        tokenId,
        estimatedMinutes: 0,
        range: 'Now',
        tokensAhead: 0,
        status: token.status,
      };
    }

    if (token.status === QueueTokenStatusEnum.COMPLETED) {
      return {
        tokenId,
        estimatedMinutes: 0,
        range: 'Completed',
        tokensAhead: 0,
        status: token.status,
      };
    }

    // 1. Get average consultation duration for doctor
    const recentStat = await this.dailyStatsRepository.findOne({
      where: { doctorClinicId: token.queueSession.doctorClinicId },
      order: { statDate: 'DESC' },
    });
    const avgConsultMinutes = recentStat && Number(recentStat.avgConsultMinutes) > 0
      ? Number(recentStat.avgConsultMinutes)
      : 12.0; // Standard 12-minute baseline

    // 2. Count tokens ahead in WAITING
    const [aheadCountRows] = await this.dataSource.query(
      `SELECT COUNT(id) AS tokens_ahead
         FROM queue_tokens
        WHERE queue_session_id = ?
          AND status = 'WAITING'
          AND (priority > ? OR (priority = ? AND (effective_time < ? OR (effective_time = ? AND token_number < ?))));`,
      [
        token.queueSessionId,
        token.priority,
        token.priority,
        token.effectiveTime,
        token.effectiveTime,
        token.tokenNumber,
      ],
    );
    const tokensAhead = parseInt(aheadCountRows[0]?.tokens_ahead || '0', 10);

    // 3. Check if someone is currently in consultation
    const [inConsultRows] = await this.dataSource.query(
      `SELECT started_at FROM queue_tokens
        WHERE queue_session_id = ? AND status = 'IN_CONSULTATION'
        LIMIT 1;`,
      [token.queueSessionId],
    );

    let currentConsultRemaining = 0;
    if (inConsultRows.length > 0 && inConsultRows[0].started_at) {
      const elapsedMinutes = (Date.now() - new Date(inConsultRows[0].started_at).getTime()) / (60 * 1000);
      currentConsultRemaining = Math.max(1, Math.round(avgConsultMinutes - elapsedMinutes));
    }

    const estimatedMinutes = Math.round(currentConsultRemaining + tokensAhead * avgConsultMinutes);
    const minRange = Math.max(2, estimatedMinutes - 3);
    const maxRange = estimatedMinutes + 5;

    // 4. Log the estimate
    const log = this.logRepository.create({
      queueTokenId: token.id,
      estimatedWaitMinutes: estimatedMinutes,
      modelType: 'HEURISTIC',
    });
    await this.logRepository.save(log);

    return {
      tokenId: token.id,
      tokenDisplay: `${token.tokenPrefix}-${token.tokenNumber}`,
      tokensAhead,
      estimatedMinutes,
      rangeText: `${minRange} - ${maxRange} mins`,
      modelType: 'HEURISTIC',
      status: token.status,
    };
  }

  async backfillActualWait(tokenId: number) {
    const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
    if (!token || !token.checkedInAt || !token.calledAt) return;

    const actualWaitMinutes = Math.round(
      (new Date(token.calledAt).getTime() - new Date(token.checkedInAt).getTime()) / (60 * 1000),
    );

    await this.logRepository.update(
      { queueTokenId: tokenId },
      { actualWaitMinutes },
    );

    this.logger.log(`⏱️ [Wait Time Backfilled] Token #${tokenId}: ${actualWaitMinutes} minutes actual wait.`);
  }
}
