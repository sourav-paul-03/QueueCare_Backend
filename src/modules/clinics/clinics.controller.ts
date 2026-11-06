import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto, UpdateClinicDto, AddClinicMembershipDto, LinkDoctorClinicDto, AddClinicHolidayDto } from './dto/clinic.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClinicScopeGuard } from './guards/clinic-scope.guard';

@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  async getAllClinics(@Query('city') city?: string) {
    return this.clinicsService.findAllClinics(city);
  }

  @Get(':id')
  async getClinicById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') currentUserId?: number,
  ) {
    return this.clinicsService.findClinicById(id, currentUserId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createClinic(
    @Body() dto: CreateClinicDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.clinicsService.createClinic(dto, currentUserId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async updateClinic(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.clinicsService.updateClinic(id, dto, currentUserId);
  }

  @Get(':id/memberships')
  @UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getMemberships(@Param('id', ParseIntPipe) id: number) {
    return this.clinicsService.getClinicMemberships(id);
  }

  @Post('memberships')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async addMembership(
    @Body() dto: AddClinicMembershipDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.clinicsService.addMembership(dto, currentUserId);
  }

  @Post('doctor-clinics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async linkDoctorClinic(
    @Body() dto: LinkDoctorClinicDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.clinicsService.linkDoctorClinic(dto, currentUserId);
  }

  @Get('doctor-clinics/list')
  async getDoctorClinics(
    @Query('clinicId') clinicId?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.clinicsService.getDoctorClinics(
      clinicId ? parseInt(clinicId, 10) : undefined,
      doctorId ? parseInt(doctorId, 10) : undefined,
    );
  }

  @Get(':id/holidays')
  async getHolidays(@Param('id', ParseIntPipe) id: number) {
    return this.clinicsService.getClinicHolidays(id);
  }

  @Post('holidays')
  @UseGuards(JwtAuthGuard, RolesGuard, ClinicScopeGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async addHoliday(
    @Body() dto: AddClinicHolidayDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.clinicsService.addHoliday(dto, currentUserId);
  }
}
