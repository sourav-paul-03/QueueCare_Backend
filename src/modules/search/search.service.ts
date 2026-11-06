import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorClinic } from '../clinics/entities/doctor-clinic.entity';
import { SearchDoctorsDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(DoctorClinic)
    private readonly doctorClinicRepository: Repository<DoctorClinic>,
  ) {}

  async searchDoctors(dto: SearchDoctorsDto) {
    const qb = this.doctorClinicRepository
      .createQueryBuilder('dc')
      .innerJoinAndSelect('dc.doctor', 'doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .innerJoinAndSelect('dc.clinic', 'clinic')
      .leftJoinAndSelect('doctor.doctorSpecialties', 'ds')
      .leftJoinAndSelect('ds.specialty', 'specialty')
      .where('dc.isActive = :dcActive', { dcActive: true })
      .andWhere('user.isActive = :userActive', { userActive: true })
      .andWhere('clinic.isActive = :clinicActive', { clinicActive: true });

    if (dto.query) {
      qb.andWhere(
        '(user.fullName LIKE :q OR doctor.bio LIKE :q OR specialty.name LIKE :q)',
        { q: `%${dto.query}%` },
      );
    }

    if (dto.specialtyId) {
      qb.andWhere('specialty.id = :specId', { specId: dto.specialtyId });
    }

    if (dto.city) {
      qb.andWhere('clinic.city = :city', { city: dto.city });
    }

    if (dto.minFee !== undefined) {
      qb.andWhere('dc.consultationFee >= :minFee', { minFee: dto.minFee });
    }

    if (dto.maxFee !== undefined) {
      qb.andWhere('dc.consultationFee <= :maxFee', { maxFee: dto.maxFee });
    }

    // Haversine distance calculation if coordinates provided
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      const radiusKm = dto.radiusKm || 20;
      // 6371 km earth radius
      qb.addSelect(
        `(6371 * acos(
          cos(radians(:lat)) * cos(radians(clinic.latitude)) *
          cos(radians(clinic.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(clinic.latitude))
        ))`,
        'distance_km',
      )
      .setParameter('lat', dto.latitude)
      .setParameter('lng', dto.longitude)
      .andWhere('clinic.latitude IS NOT NULL AND clinic.longitude IS NOT NULL')
      .andHaving('distance_km <= :radiusKm', { radiusKm })
      .orderBy('distance_km', 'ASC');
    } else {
      qb.orderBy('user.fullName', 'ASC');
    }

    const items = await qb.getMany();
    return items;
  }
}
