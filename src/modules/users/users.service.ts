import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRoleEnum } from './entities/user.entity';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';
import { Specialty } from './entities/specialty.entity';
import { DoctorSpecialty } from './entities/doctor-specialty.entity';
import { UpdateUserDto, UpdatePatientProfileDto, CreateDoctorProfileDto, CreateSpecialtyDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Specialty)
    private readonly specialtyRepository: Repository<Specialty>,
    @InjectRepository(DoctorSpecialty)
    private readonly doctorSpecialtyRepository: Repository<DoctorSpecialty>,
  ) {}

  async findAllUsers() {
    return this.userRepository.find({
      select: ['id', 'fullName', 'phone', 'email', 'role', 'isActive', 'createdAt'],
    });
  }

  async findUserById(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;
    if (dto.email) user.email = dto.email;

    const saved = await this.userRepository.save(user);
    const { passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async getPatientByUserId(userId: number) {
    let patient = await this.patientRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!patient) {
      // Auto-create if user is patient
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      patient = this.patientRepository.create({ userId });
      patient = await this.patientRepository.save(patient);
      patient.user = user;
    }
    return patient;
  }

  async updatePatientProfile(userId: number, dto: UpdatePatientProfileDto) {
    let patient = await this.patientRepository.findOne({ where: { userId } });
    if (!patient) {
      patient = this.patientRepository.create({ userId });
    }

    if (dto.dob) patient.dob = new Date(dto.dob);
    if (dto.gender) patient.gender = dto.gender;
    if (dto.bloodGroup) patient.bloodGroup = dto.bloodGroup;
    if (dto.emergencyContact) patient.emergencyContact = dto.emergencyContact;
    if (dto.address) patient.address = dto.address;

    return this.patientRepository.save(patient);
  }

  async findAllDoctors() {
    const doctors = await this.doctorRepository.find({
      relations: ['user'],
    });

    const results = [];
    for (const doc of doctors) {
      const docSpecs = await this.doctorSpecialtyRepository.find({
        where: { doctorId: doc.id },
        relations: ['specialty'],
      });
      results.push({
        ...doc,
        specialties: docSpecs.map((ds) => ({
          ...ds.specialty,
          isPrimary: ds.isPrimary,
        })),
      });
    }
    return results;
  }

  async findDoctorById(id: number) {
    const doc = await this.doctorRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!doc) throw new NotFoundException(`Doctor with ID ${id} not found`);

    const docSpecs = await this.doctorSpecialtyRepository.find({
      where: { doctorId: doc.id },
      relations: ['specialty'],
    });

    return {
      ...doc,
      specialties: docSpecs.map((ds) => ({
        ...ds.specialty,
        isPrimary: ds.isPrimary,
      })),
    };
  }

  async findDoctorByUserId(userId: number) {
    const doc = await this.doctorRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!doc) return null;

    const docSpecs = await this.doctorSpecialtyRepository.find({
      where: { doctorId: doc.id },
      relations: ['specialty'],
    });

    return {
      ...doc,
      specialties: docSpecs.map((ds) => ({
        ...ds.specialty,
        isPrimary: ds.isPrimary,
      })),
    };
  }

  async createDoctorProfile(dto: CreateDoctorProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existingDoctor = await this.doctorRepository.findOne({ where: { userId: dto.userId } });
    if (existingDoctor) throw new ConflictException('Doctor profile already exists for this user');

    const doctor = this.doctorRepository.create({
      userId: dto.userId,
      licenseNumber: dto.licenseNumber,
      bio: dto.bio,
      experienceYears: dto.experienceYears || 0,
      consultationFee: dto.consultationFee || 0,
    });

    const savedDoctor = await this.doctorRepository.save(doctor);

    if (dto.specialtyIds && dto.specialtyIds.length > 0) {
      let isFirst = true;
      for (const specId of dto.specialtyIds) {
        const ds = this.doctorSpecialtyRepository.create({
          doctorId: savedDoctor.id,
          specialtyId: specId,
          isPrimary: isFirst,
        });
        await this.doctorSpecialtyRepository.save(ds);
        isFirst = false;
      }
    }

    user.role = UserRoleEnum.DOCTOR;
    await this.userRepository.save(user);

    return this.findDoctorById(savedDoctor.id);
  }

  async findAllSpecialties() {
    return this.specialtyRepository.find({ order: { name: 'ASC' } });
  }

  async createSpecialty(dto: CreateSpecialtyDto) {
    const existing = await this.specialtyRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Specialty already exists');

    const spec = this.specialtyRepository.create(dto);
    return this.specialtyRepository.save(spec);
  }

  async seedDefaultSpecialties() {
    const defaultList = [
      { name: 'Cardiology', description: 'Heart and cardiovascular system care' },
      { name: 'Dermatology', description: 'Skin, hair, and nail treatments' },
      { name: 'Pediatrics', description: 'Infant, child, and adolescent medical care' },
      { name: 'General Medicine', description: 'Comprehensive adult health and diagnosis' },
      { name: 'Orthopedics', description: 'Bones, joints, ligaments, and tendons' },
      { name: 'Neurology', description: 'Brain and nervous system disorders' },
      { name: 'Gynecology & Obstetrics', description: 'Women reproductive health and maternity' },
      { name: 'ENT (Otolaryngology)', description: 'Ear, nose, and throat treatments' },
      { name: 'Ophthalmology', description: 'Eye and vision care' },
      { name: 'Psychiatry', description: 'Mental health and behavioral wellness' },
    ];

    for (const item of defaultList) {
      const exists = await this.specialtyRepository.findOne({ where: { name: item.name } });
      if (!exists) {
        await this.specialtyRepository.save(this.specialtyRepository.create(item));
      }
    }
  }
}
