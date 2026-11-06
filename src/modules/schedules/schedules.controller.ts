import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, CreateExceptionDto, GetSlotsQueryDto } from './dto/schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('slots')
  async getAvailableSlots(@Query() query: GetSlotsQueryDto) {
    return this.schedulesService.generateSlots(query);
  }

  @Get(':doctorClinicId')
  async getDoctorClinicSchedules(@Param('doctorClinicId', ParseIntPipe) doctorClinicId: number) {
    return this.schedulesService.getDoctorClinicSchedules(doctorClinicId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR)
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.createSchedule(dto);
  }

  @Get(':doctorClinicId/exceptions')
  async getExceptions(@Param('doctorClinicId', ParseIntPipe) doctorClinicId: number) {
    return this.schedulesService.getExceptions(doctorClinicId);
  }

  @Post('exceptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR)
  async createException(@Body() dto: CreateExceptionDto) {
    return this.schedulesService.createException(dto);
  }
}
