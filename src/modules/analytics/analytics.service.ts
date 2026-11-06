import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailyDoctorStat } from './entities/daily-doctor-stat.entity';
import { HourlyLoadStat } from './entities/hourly-load-stat.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(DailyDoctorStat)
    private readonly dailyStatsRepository: Repository<DailyDoctorStat>,
    @InjectRepository(HourlyLoadStat)
    private readonly hourlyStatsRepository: Repository<HourlyLoadStat>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    private readonly dataSource: DataSource,
  ) {}

  async aggregateStatsForDate(doctorClinicId: number, statDate: string) {
    // 1. Calculate counts and average durations from queue_tokens
    const [statsRows] = await this.dataSource.query(
      `SELECT
         COUNT(qt.id) AS total_tokens,
         SUM(CASE WHEN qt.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN qt.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count,
         SUM(CASE WHEN qt.status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show_count,
         COALESCE(AVG(CASE WHEN qt.called_at IS NOT NULL AND qt.checked_in_at IS NOT NULL
                           THEN TIMESTAMPDIFF(SECOND, qt.checked_in_at, qt.called_at) / 60.0 END), 0.0) AS avg_wait_minutes,
         COALESCE(AVG(CASE WHEN qt.completed_at IS NOT NULL AND qt.started_at IS NOT NULL
                           THEN TIMESTAMPDIFF(SECOND, qt.started_at, qt.completed_at) / 60.0 END), 0.0) AS avg_consult_minutes
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qt.queue_session_id = qs.id
       WHERE qs.doctor_clinic_id = ? AND qs.queue_date = ?;`,
      [doctorClinicId, statDate],
    );

    const s = statsRows[0];

    await this.dataSource.query(
      `INSERT INTO daily_doctor_stats (doctor_clinic_id, stat_date, total_tokens, completed_count, cancelled_count, no_show_count, avg_wait_minutes, avg_consult_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_tokens = VALUES(total_tokens),
         completed_count = VALUES(completed_count),
         cancelled_count = VALUES(cancelled_count),
         no_show_count = VALUES(no_show_count),
         avg_wait_minutes = VALUES(avg_wait_minutes),
         avg_consult_minutes = VALUES(avg_consult_minutes);`,
      [
        doctorClinicId,
        statDate,
        s.total_tokens || 0,
        s.completed_count || 0,
        s.cancelled_count || 0,
        s.no_show_count || 0,
        parseFloat(s.avg_wait_minutes || '0.00').toFixed(2),
        parseFloat(s.avg_consult_minutes || '0.00').toFixed(2),
      ],
    );

    this.logger.log(`📊 [Analytics] Aggregated daily stats for DoctorClinic #${doctorClinicId} on ${statDate}`);
    return this.dailyStatsRepository.findOne({ where: { doctorClinicId, statDate } });
  }

  async getDailyStats(doctorClinicId: number, days = 14) {
    return this.dailyStatsRepository
      .createQueryBuilder('ds')
      .where('ds.doctorClinicId = :doctorClinicId', { doctorClinicId })
      .orderBy('ds.statDate', 'DESC')
      .take(days)
      .getMany();
  }

  async getClinicDashboard(clinicId: number) {
    const doctorClinics = await this.doctorClinicRepository.find({
      where: { clinicId, isActive: true },
      relations: ['doctor', 'doctor.user'],
    });

    const dcIds = doctorClinics.map((dc) => dc.id);
    if (dcIds.length === 0) {
      return { totalDoctors: 0, todayTokens: 0, completedTokens: 0, doctors: [] };
    }

    const today = new Date().toISOString().slice(0, 10);

    const [todayTotals] = await this.dataSource.query(
      `SELECT
         COUNT(qt.id) AS today_tokens,
         SUM(CASE WHEN qt.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_tokens,
         SUM(CASE WHEN qt.status = 'WAITING' THEN 1 ELSE 0 END) AS waiting_tokens
       FROM queue_tokens qt
       JOIN queue_sessions qs ON qt.queue_session_id = qs.id
       WHERE qs.doctor_clinic_id IN (?) AND qs.queue_date = ?;`,
      [dcIds, today],
    );

    return {
      clinicId,
      date: today,
      totalDoctors: doctorClinics.length,
      todayTokens: todayTotals[0]?.today_tokens || 0,
      completedTokens: todayTotals[0]?.completed_tokens || 0,
      waitingTokens: todayTotals[0]?.waiting_tokens || 0,
      doctors: doctorClinics.map((dc) => ({
        doctorClinicId: dc.id,
        doctorName: dc.doctor?.user?.fullName,
        roomNumber: dc.roomNumber,
        tokenPrefix: dc.tokenPrefix,
      })),
    };
  }
}
