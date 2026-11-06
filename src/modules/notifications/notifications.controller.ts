import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto, SendNotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyNotifications(@CurrentUser('userId') currentUserId: number) {
    return this.notificationsService.getUserNotifications(currentUserId);
  }

  @Post('device-token')
  @UseGuards(JwtAuthGuard)
  async registerDeviceToken(
    @CurrentUser('userId') currentUserId: number,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(currentUserId, dto);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') currentUserId: number,
  ) {
    return this.notificationsService.markAsRead(id, currentUserId);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@CurrentUser('userId') currentUserId: number) {
    return this.notificationsService.markAllAsRead(currentUserId);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }
}
