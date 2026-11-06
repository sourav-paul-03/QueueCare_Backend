import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRoleEnum } from '../users/entities/user.entity';
import { Patient } from '../users/entities/patient.entity';
import { Doctor } from '../users/entities/doctor.entity';
import { OtpCode } from './entities/otp-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto, RequestOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(OtpCode)
    private readonly otpRepository: Repository<OtpCode>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashSecret(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  async register(dto: RegisterDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('At least one of phone or email must be provided');
    }

    if (dto.phone) {
      const existingPhone = await this.userRepository.findOne({ where: { phone: dto.phone } });
      if (existingPhone) {
        throw new ConflictException('A user with this phone number already exists');
      }
    }

    if (dto.email) {
      const existingEmail = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existingEmail) {
        throw new ConflictException('A user with this email address already exists');
      }
    }

    let passwordHash: string | undefined = undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const role = dto.role || UserRoleEnum.PATIENT;

    const user = this.userRepository.create({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      role,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Auto-create patient profile if role is PATIENT
    if (role === UserRoleEnum.PATIENT) {
      const patient = this.patientRepository.create({
        userId: savedUser.id,
      });
      await this.patientRepository.save(patient);
    }

    const tokens = await this.generateTokens(savedUser);
    return {
      user: {
        id: savedUser.id,
        fullName: savedUser.fullName,
        phone: savedUser.phone,
        email: savedUser.email,
        role: savedUser.role,
      },
      tokens,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: [{ phone: dto.identifier }, { email: dto.identifier }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Password not set for this account. Please use OTP login.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive. Please contact support.');
    }

    const tokens = await this.generateTokens(user);
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      tokens,
      ...tokens,
    };
  }

  async requestOtp(dto: RequestOtpDto) {
    const identifier = dto.identifier.trim();
    // 6-digit numeric OTP code
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = this.hashSecret(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Invalidate existing unused OTPs
    await this.otpRepository.delete({ identifier });

    const otp = this.otpRepository.create({
      identifier,
      codeHash,
      expiresAt,
      attempts: 0,
    });

    await this.otpRepository.save(otp);

    this.logger.log(`📱 [OTP Dispatch] Generated OTP for ${identifier}: ${rawOtp}`);

    return {
      message: 'OTP sent successfully',
      identifier,
      expiresInSeconds: 300,
      devOtp: process.env.NODE_ENV === 'production' ? undefined : rawOtp,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const identifier = dto.identifier.trim();
    const codeHash = this.hashSecret(dto.code.trim());

    const otp = await this.otpRepository.findOne({
      where: { identifier },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('No active OTP found. Please request a new one.');
    }

    if (new Date() > otp.expiresAt) {
      await this.otpRepository.delete(otp.id);
      throw new BadRequestException('OTP code has expired. Please request a new one.');
    }

    if (otp.attempts >= 5) {
      await this.otpRepository.delete(otp.id);
      throw new BadRequestException('Too many failed attempts. OTP has been locked.');
    }

    if (otp.codeHash !== codeHash) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new BadRequestException(`Invalid OTP code. Attempts remaining: ${5 - otp.attempts}`);
    }

    // Mark consumed and remove
    await this.otpRepository.delete(otp.id);

    // Find or create user
    let user = await this.userRepository.findOne({
      where: [{ phone: identifier }, { email: identifier }],
    });

    if (!user) {
      const isEmail = identifier.includes('@');
      user = this.userRepository.create({
        fullName: isEmail ? identifier.split('@')[0] : `Patient-${identifier.slice(-4)}`,
        phone: isEmail ? undefined : identifier,
        email: isEmail ? identifier : undefined,
        role: UserRoleEnum.PATIENT,
        isActive: true,
      });
      user = await this.userRepository.save(user);

      const patient = this.patientRepository.create({ userId: user.id });
      await this.patientRepository.save(patient);
    }

    const tokens = await this.generateTokens(user);
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      tokens,
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const tokenHash = this.hashSecret(dto.refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: If token was already revoked, someone is replaying a stolen token!
    if (storedToken.revoked) {
      this.logger.warn(`🚨 [Security Alarm] Reused revoked token for user ${storedToken.userId}! Revoking all sessions.`);
      await this.refreshTokenRepository.update({ userId: storedToken.userId }, { revoked: true });
      throw new UnauthorizedException('Token reuse detected. All sessions revoked for security.');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // Revoke old refresh token
    storedToken.revoked = true;
    await this.refreshTokenRepository.save(storedToken);

    // Fetch user
    const user = await this.userRepository.findOne({ where: { id: storedToken.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    // Issue new pair
    const tokens = await this.generateTokens(user);
    return {
      tokens,
      ...tokens,
    };
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate random raw refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashSecret(rawRefreshToken);
    const refreshTokenDays = this.configService.get<number>('auth.refreshTokenDays') || 7;
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      revoked: false,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: '1d',
    };
  }
}
