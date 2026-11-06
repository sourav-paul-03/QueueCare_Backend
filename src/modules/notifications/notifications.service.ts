import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { RegisterDeviceTokenDto, SendNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  async registerDeviceToken(userId: number, dto: RegisterDeviceTokenDto): Promise<DeviceToken> {
    const existing = await this.deviceTokenRepository.findOne({
      where: { deviceToken: dto.deviceToken },
    });

    if (existing) {
      existing.userId = userId;
      existing.platform = dto.platform;
      return this.deviceTokenRepository.save(existing);
    }

    const token = this.deviceTokenRepository.create({
      userId,
      deviceToken: dto.deviceToken,
      platform: dto.platform,
    });
    return this.deviceTokenRepository.save(token);
  }

  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    // Idempotency check with dedupeKey
    if (dto.dedupeKey) {
      const existing = await this.notificationRepository.findOne({
        where: { dedupeKey: dto.dedupeKey },
      });
      if (existing) {
        this.logger.log(`⏩ [Notification Dedupe] Notification with key ${dto.dedupeKey} already sent.`);
        return existing;
      }
    }

    const notif = this.notificationRepository.create({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      channel: dto.channel || 'IN_APP',
      dedupeKey: dto.dedupeKey,
      metadata: dto.metadata,
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notif);
    this.logger.log(`🔔 [Notification Dispatched] User #${dto.userId}: "${dto.title}"`);
    return saved;
  }

  async getUserNotifications(userId: number, limit = 50) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(notificationId: number, userId: number) {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true },
    );
    return { success: true, notificationId };
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }
}
