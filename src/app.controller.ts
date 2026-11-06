import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  async healthCheck() {
    const isDbConnected = this.dataSource.isInitialized;
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'QueueCare Backend API',
      database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
      uptime: process.uptime(),
    };
  }

  @Get()
  getRoot() {
    return {
      service: 'QueueCare Real-Time Healthcare Queue API',
      version: '1.0.0',
      docs: '/api/v1',
    };
  }
}
