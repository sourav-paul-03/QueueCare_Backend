import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, dbConfig, authConfig } from './config/configuration';
import { AppController } from './app.controller';
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
