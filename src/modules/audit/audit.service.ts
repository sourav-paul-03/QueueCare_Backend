import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface RecordAuditParams {
  userId?: number;
  clinicId?: number;
  action: string;
  entityType: string;
  entityId?: string | number;
  ipAddress?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async logAction(params: RecordAuditParams): Promise<AuditLog> {
    const entry = this.auditRepository.create({
      userId: params.userId,
      clinicId: params.clinicId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ? String(params.entityId) : undefined,
      ipAddress: params.ipAddress,
      metadata: params.metadata,
    });
    return this.auditRepository.save(entry);
  }

  async getClinicAuditLogs(clinicId: number, limit = 50) {
    return this.auditRepository.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
