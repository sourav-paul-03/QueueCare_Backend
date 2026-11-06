import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdatePatientProfileDto, CreateDoctorProfileDto, CreateSpecialtyDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get('specialties')
  async getSpecialties() {
    return this.usersService.findAllSpecialties();
  }

  @Post('specialties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async createSpecialty(@Body() dto: CreateSpecialtyDto) {
    return this.usersService.createSpecialty(dto);
  }

  @Get('doctors')
  async getAllDoctors() {
    return this.usersService.findAllDoctors();
  }

  @Get('doctors/:id')
  async getDoctorById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findDoctorById(id);
  }

  @Post('doctors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createDoctorProfile(@Body() dto: CreateDoctorProfileDto) {
    return this.usersService.createDoctorProfile(dto);
  }

  @Get('patient/profile')
  @UseGuards(JwtAuthGuard)
  async getMyPatientProfile(@CurrentUser('userId') userId: number) {
    return this.usersService.getPatientByUserId(userId);
  }

  @Put('patient/profile')
  @UseGuards(JwtAuthGuard)
  async updateMyPatientProfile(
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.usersService.updatePatientProfile(userId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findUserById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }
}
