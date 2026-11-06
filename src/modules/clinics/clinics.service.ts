import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { ClinicMembership } from './entities/clinic-membership.entity';
import { DoctorClinic } from './entities/doctor-clinic.entity';
import { ClinicHoliday } from './entities/clinic-holiday.entity';
import { AuditService } from '../audit/audit.service';
import { CreateClinicDto, UpdateClinicDto, AddClinicMembershipDto, LinkDoctorClinicDto, AddClinicHolidayDto } from './dto/clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinicRepository: Repository<Clinic>,
    @InjectRepository(ClinicMembership)
    private readonly membershipRepository: Repository<ClinicMembership>,
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
    @InjectRepository(ClinicHoliday)
    private readonly holidayRepository: Repository<ClinicHoliday>,
    private readonly auditService: AuditService,
  ) {}

  async createClinic(dto: CreateClinicDto, currentUserId?: number): Promise<Clinic> {
    const clinic = this.clinicRepository.create(dto);
    const saved = await this.clinicRepository.save(clinic);

    if (currentUserId) {
      await this.membershipRepository.save(
        this.membershipRepository.create({
          clinicId: saved.id,
          userId: currentUserId,
          role: 'CLINIC_ADMIN',
          isActive: true,
        }),
      );

      await this.auditService.logAction({
        userId: currentUserId,
        clinicId: saved.id,
        action: 'CREATE_CLINIC',
        entityType: 'CLINIC',
        entityId: saved.id,
        metadata: { name: saved.name },
      });
    }

    return saved;
  }

  async findAllClinics(city?: string): Promise<Clinic[]> {
    if (city) {
      return this.clinicRepository.find({
        where: { city, isActive: true },
        order: { name: 'ASC' },
      });
    }
    return this.clinicRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findClinicById(id: number, currentUserId?: number): Promise<Clinic> {
    const clinic = await this.clinicRepository.findOne({ where: { id } });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID ${id} not found`);
    }

    if (currentUserId) {
      await this.auditService.logAction({
        userId: currentUserId,
        clinicId: id,
        action: 'VIEW_CLINIC_DETAILS',
        entityType: 'CLINIC',
        entityId: id,
      });
    }

    return clinic;
  }

  async updateClinic(id: number, dto: UpdateClinicDto, currentUserId?: number): Promise<Clinic> {
    const clinic = await this.findClinicById(id);
    Object.assign(clinic, dto);
    const updated = await this.clinicRepository.save(clinic);

    if (currentUserId) {
      await this.auditService.logAction({
        userId: currentUserId,
        clinicId: id,
        action: 'UPDATE_CLINIC',
        entityType: 'CLINIC',
        entityId: id,
        metadata: dto,
      });
    }

    return updated;
  }

  async addMembership(dto: AddClinicMembershipDto, currentUserId?: number): Promise<ClinicMembership> {
    const existing = await this.membershipRepository.findOne({
      where: { clinicId: dto.clinicId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this clinic');
    }

    const membership = this.membershipRepository.create(dto);
    const saved = await this.membershipRepository.save(membership);

    if (currentUserId) {
      await this.auditService.logAction({
        userId: currentUserId,
        clinicId: dto.clinicId,
        action: 'ADD_CLINIC_MEMBERSHIP',
        entityType: 'CLINIC_MEMBERSHIP',
        entityId: saved.id,
        metadata: { targetUserId: dto.userId, role: dto.role },
      });
    }

    return saved;
  }

  async getClinicMemberships(clinicId: number): Promise<ClinicMembership[]> {
    return this.membershipRepository.find({
      where: { clinicId, isActive: true },
      relations: ['user'],
    });
  }

  async linkDoctorClinic(dto: LinkDoctorClinicDto, currentUserId?: number): Promise<DoctorClinic> {
    const existing = await this.doctorClinicRepository.findOne({
      where: { doctorId: dto.doctorId, clinicId: dto.clinicId },
    });
    if (existing) {
      throw new ConflictException('Doctor is already affiliated with this clinic');
    }

    const dc = this.doctorClinicRepository.create(dto);
    const saved = await this.doctorClinicRepository.save(dc);

    if (currentUserId) {
      await this.auditService.logAction({
        userId: currentUserId,
        clinicId: dto.clinicId,
        action: 'LINK_DOCTOR_CLINIC',
        entityType: 'DOCTOR_CLINIC',
        entityId: saved.id,
        metadata: { doctorId: dto.doctorId },
      });
    }

    return saved;
  }

  async getDoctorClinics(clinicId?: number, doctorId?: number): Promise<DoctorClinic[]> {
    const query = this.doctorClinicRepository
      .createQueryBuilder('dc')
      .leftJoinAndSelect('dc.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('dc.clinic', 'clinic')
      .where('dc.isActive = :isActive', { isActive: true });

    if (clinicId) {
      query.andWhere('dc.clinicId = :clinicId', { clinicId });
    }
    if (doctorId) {
      query.andWhere('dc.doctorId = :doctorId', { doctorId });
    }

    return query.getMany();
  }

  async addHoliday(dto: AddClinicHolidayDto, currentUserId?: number): Promise<ClinicHoliday> {
    const existing = await this.holidayRepository.findOne({
      where: { clinicId: dto.clinicId, holidayDate: dto.holidayDate },
    });
    if (existing) {
      throw new ConflictException('A holiday is already recorded for this date');
    }

    const holiday = this.holidayRepository.create(dto);
    const saved = await this.holidayRepository.save(holiday);

    if (currentUserId) {
      await this.auditService.logAction({
        userId: currentUserId,
        clinicId: dto.clinicId,
        action: 'ADD_CLINIC_HOLIDAY',
        entityType: 'CLINIC_HOLIDAY',
        entityId: saved.id,
        metadata: { holidayDate: dto.holidayDate },
      });
    }

    return saved;
  }

  async getClinicHolidays(clinicId: number): Promise<ClinicHoliday[]> {
    return this.holidayRepository.find({
      where: { clinicId },
      order: { holidayDate: 'ASC' },
    });
  }
}
