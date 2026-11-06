import { Controller, Get, Post, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('doctor-clinic/:doctorClinicId')
  @UseGuards(JwtAuthGuard)
  async getDoctorClinicDailyStats(
    @Param('doctorClinicId', ParseIntPipe) doctorClinicId: number,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getDailyStats(doctorClinicId, days ? parseInt(days, 10) : 14);
  }

  @Post('aggregate/:doctorClinicId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async runAggregation(
    @Param('doctorClinicId', ParseIntPipe) doctorClinicId: number,
    @Query('date') date?: string,
  ) {
    const statDate = date || new Date().toISOString().slice(0, 10);
    return this.analyticsService.aggregateStatsForDate(doctorClinicId, statDate);
  }

  @Get('clinic/:clinicId')
  @UseGuards(JwtAuthGuard)
  async getClinicDashboard(@Param('clinicId', ParseIntPipe) clinicId: number) {
    return this.analyticsService.getClinicDashboard(clinicId);
  }
}
