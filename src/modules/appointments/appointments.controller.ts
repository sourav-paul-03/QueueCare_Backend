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
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto, CancelAppointmentDto, RescheduleAppointmentDto } from './dto/appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('book')
  @UseGuards(JwtAuthGuard)
  async bookAppointment(
    @Body() dto: BookAppointmentDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.appointmentsService.bookAppointment(dto, currentUserId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.appointmentsService.cancelAppointment(id, dto, currentUserId);
  }

  @Post(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async rescheduleAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.appointmentsService.rescheduleAppointment(id, dto, currentUserId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyAppointments(@CurrentUser('userId') currentUserId: number) {
    return this.appointmentsService.getMyAppointments(currentUserId);
  }

  @Get('doctor-clinic/:doctorClinicId')
  @UseGuards(JwtAuthGuard)
  async getDoctorClinicAppointments(
    @Param('doctorClinicId', ParseIntPipe) doctorClinicId: number,
    @Query('date') date?: string,
  ) {
    return this.appointmentsService.getDoctorClinicAppointments(doctorClinicId, date);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  async getAppointmentHistory(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.getAppointmentHistory(id);
  }
}
