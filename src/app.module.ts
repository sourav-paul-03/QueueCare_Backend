import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, dbConfig, authConfig } from './config/configuration';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { SearchModule } from './modules/search/search.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, authConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [path.join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: false,
        logging: false,
        timezone: '+00:00',
        extra: {
          connectionLimit: 30,
        },
      }),
    }),
    AuthModule,
    UsersModule,
    AuditModule,
    ClinicsModule,
    SearchModule,
    SchedulesModule,
    AppointmentsModule,
    QueueModule,
    NotificationsModule,
    ReviewsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
