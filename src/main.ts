import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('QueueCare-Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const corsOrigin = configService.get<string>('app.corsOrigin') || 'http://localhost:3000';

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`🚀 QueueCare Backend API running on: http://localhost:${port}/api/v1`);
  logger.log(`🩺 Health check accessible at: http://localhost:${port}/api/v1/health`);
  logger.log(`=======================================================`);
}
bootstrap();
