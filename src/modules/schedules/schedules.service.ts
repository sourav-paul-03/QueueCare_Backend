import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorSchedule } from './entities/doctor-schedule.entity';
import { ScheduleBreak } from './entities/schedule-break.entity';
import { ScheduleException } from './entities/schedule-exception.entity';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { ClinicHoliday } from '../clinics/entities/clinic-holiday.entity';
import { CreateScheduleDto, CreateExceptionDto, GetSlotsQueryDto } from './dto/schedule.dto';

export interface GeneratedSlot {
  slotTime: string; // HH:mm:ss
  startAt: string;  // ISO string UTC
  endAt: string;    // ISO string UTC
  isAvailable: boolean;
  reason?: string;
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly scheduleRepository: Repository<DoctorSchedule>,
    @InjectRepository(ScheduleBreak)
    private readonly breakRepository: Repository<ScheduleBreak>,
    @InjectRepository(ScheduleException)
    private readonly exceptionRepository: Repository<ScheduleException>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    @InjectRepository(ClinicHoliday)
    private readonly holidayRepository: Repository<ClinicHoliday>,
  ) {}

  async createSchedule(dto: CreateScheduleDto): Promise<DoctorSchedule> {
    const dc = await this.doctorClinicRepository.findOne({ where: { id: dto.doctorClinicId } });
    if (!dc) throw new NotFoundException('Doctor Clinic affiliation not found');

    // Overlapping schedule check
    const existing = await this.scheduleRepository.findOne({
      where: {
        doctorClinicId: dto.doctorClinicId,
        dayOfWeek: dto.dayOfWeek,
        isActive: true,
      },
    });

    if (existing) {
      existing.isActive = false;
      await this.scheduleRepository.save(existing);
    }

    const schedule = this.scheduleRepository.create({
      doctorClinicId: dto.doctorClinicId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      slotDuration: dto.slotDuration || 15,
      maxPatients: dto.maxPatients || 30,
      isActive: true,
    });

    const saved = await this.scheduleRepository.save(schedule);

    if (dto.breaks && dto.breaks.length > 0) {
      for (const b of dto.breaks) {
        const brk = this.breakRepository.create({
          doctorScheduleId: saved.id,
          startTime: b.startTime,
          endTime: b.endTime,
          description: b.description,
        });
        await this.breakRepository.save(brk);
      }
    }

    return this.scheduleRepository.findOne({
      where: { id: saved.id },
      relations: ['breaks'],
    });
  }

  async getDoctorClinicSchedules(doctorClinicId: number): Promise<DoctorSchedule[]> {
    return this.scheduleRepository.find({
      where: { doctorClinicId, isActive: true },
      relations: ['breaks'],
      order: { dayOfWeek: 'ASC' },
    });
  }

  async createException(dto: CreateExceptionDto): Promise<ScheduleException> {
    const exception = this.exceptionRepository.create(dto);
    return this.exceptionRepository.save(exception);
  }

  async getExceptions(doctorClinicId: number): Promise<ScheduleException[]> {
    return this.exceptionRepository.find({
      where: { doctorClinicId },
      order: { exceptionDate: 'ASC' },
    });
  }

  async generateSlots(query: GetSlotsQueryDto) {
    const { doctorClinicId, date } = query;
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const dc = await this.doctorClinicRepository.findOne({
      where: { id: doctorClinicId },
      relations: ['clinic'],
    });
    if (!dc) throw new NotFoundException('Doctor Clinic affiliation not found');

    // 1. Clinic Holiday Check
    const holiday = await this.holidayRepository.findOne({
      where: { clinicId: dc.clinicId, holidayDate: date },
    });
    if (holiday) {
      return {
        available: false,
        reason: `Clinic Holiday: ${holiday.reason || 'Closed'}`,
        slots: [],
      };
    }

    // 2. Exception Check (Overrides regular schedule)
    const exception = await this.exceptionRepository.findOne({
      where: { doctorClinicId, exceptionDate: date },
    });

    if (exception && !exception.isAvailable) {
      return {
        available: false,
        reason: `Doctor on leave: ${exception.reason || 'Unavailable'}`,
        slots: [],
      };
    }

    let startTime = '09:00:00';
    let endTime = '17:00:00';
    let slotDuration = 15;
    let breaks: ScheduleBreak[] = [];

    if (exception && exception.isAvailable && exception.startTime && exception.endTime) {
      startTime = exception.startTime;
      endTime = exception.endTime;
    } else {
      // 3. Regular Schedule Lookup
      const dayOfWeek = targetDate.getUTCDay();
      const schedule = await this.scheduleRepository.findOne({
        where: { doctorClinicId, dayOfWeek, isActive: true },
        relations: ['breaks'],
      });

      if (!schedule) {
        return {
          available: false,
          reason: 'Doctor does not practice on this day of week',
          slots: [],
        };
      }

      startTime = schedule.startTime;
      endTime = schedule.endTime;
      slotDuration = schedule.slotDuration || 15;
      breaks = schedule.breaks || [];
    }

    // 4. Generate Slots
    const parseMinutes = (t: string) => {
      const parts = t.split(':').map((p) => parseInt(p, 10));
      return parts[0] * 60 + parts[1];
    };

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}:00`;
    };

    const startMin = parseMinutes(startTime);
    const endMin = parseMinutes(endTime);
    const breakRanges = breaks.map((b) => ({
      start: parseMinutes(b.startTime),
      end: parseMinutes(b.endTime),
    }));

    const slots: GeneratedSlot[] = [];
    const now = new Date();

    for (let current = startMin; current + slotDuration <= endMin; current += slotDuration) {
      const isBreak = breakRanges.some((b) => current >= b.start && current < b.end);
      if (isBreak) continue;

      const slotTime = formatTime(current);
      const slotStartAt = new Date(`${date}T${slotTime}Z`);
      const slotEndAt = new Date(slotStartAt.getTime() + slotDuration * 60 * 1000);

      // Check if slot is in the past
      const isPast = slotStartAt.getTime() < now.getTime();

      slots.push({
        slotTime,
        startAt: slotStartAt.toISOString(),
        endAt: slotEndAt.toISOString(),
        isAvailable: !isPast,
        reason: isPast ? 'Past slot' : undefined,
      });
    }

    return {
      available: true,
      doctorClinicId,
      date,
      totalSlots: slots.length,
      slots,
    };
  }
}
