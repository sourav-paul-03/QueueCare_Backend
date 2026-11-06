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
import { QueueService } from './queue.service';
import { WalkInCheckInDto, CallNextDto, ActionTokenDto, UpdateSessionStatusDto, CheckInDto } from './dto/queue.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('state/:doctorClinicId')
  async getQueueState(
    @Param('doctorClinicId', ParseIntPipe) doctorClinicId: number,
    @Query('date') date?: string,
  ) {
    const queueDate = date || new Date().toISOString().slice(0, 10);
    return this.queueService.getSessionState(doctorClinicId, queueDate);
  }

  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  async checkInToken(
    @Body() dto: CheckInDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.checkInBookedToken(dto.tokenId, currentUserId);
  }

  @Post('walk-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async walkInCheckIn(
    @Body() dto: WalkInCheckInDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.walkInCheckIn(dto, currentUserId);
  }

  @Post('call-next')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async callNext(
    @Body() dto: CallNextDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.callNext(dto, currentUserId);
  }

  @Post('start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.DOCTOR)
  async startConsultation(
    @Body() dto: ActionTokenDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.startConsultation(dto, currentUserId);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.DOCTOR)
  async completeConsultation(
    @Body() dto: ActionTokenDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.completeConsultation(dto, currentUserId);
  }

  @Post('skip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async skipToken(
    @Body() dto: ActionTokenDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.skipToken(dto, currentUserId);
  }

  @Post('reinstate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async reinstateToken(
    @Body() dto: ActionTokenDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.reinstateToken(dto, currentUserId);
  }

  @Post('no-show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async noShowToken(
    @Body() dto: ActionTokenDto,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.queueService.noShowToken(dto, currentUserId);
  }

  @Post('recall')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async recallToken(@Body() dto: ActionTokenDto) {
    return this.queueService.recallToken(dto);
  }

  @Post('session-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.DOCTOR)
  async updateSessionStatus(@Body() dto: UpdateSessionStatusDto) {
    return this.queueService.updateSessionStatus(dto);
  }

  @Get('token/:tokenId/events')
  @UseGuards(JwtAuthGuard)
  async getTokenEvents(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return this.queueService.getTokenEvents(tokenId);
  }
}
