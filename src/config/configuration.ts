import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));

export const dbConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'queuecare',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'queuecare_super_secret_jwt_key_2026_dev_mode',
  jwtExpiration: process.env.JWT_EXPIRATION || '1d',
  refreshTokenDays: parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '7', 10),
}));
