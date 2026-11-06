import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicMembership } from '../entities/clinic-membership.entity';
import { UserRoleEnum } from '../../users/entities/user.entity';

@Injectable()
export class ClinicScopeGuard implements CanActivate {
  constructor(
    @InjectRepository(ClinicMembership)
    private readonly membershipRepository: Repository<ClinicMembership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User identity not established');
    }

    // Super Admin has global scope
    if (user.role === UserRoleEnum.SUPER_ADMIN) {
      return true;
    }

    const clinicId = request.params.clinicId || request.body?.clinicId || request.query?.clinicId;
    if (!clinicId) {
      // If no clinic ID specified in request, let route handler handle or bypass
      return true;
    }

    const membership = await this.membershipRepository.findOne({
      where: {
        clinicId: parseInt(clinicId, 10),
        userId: user.userId,
        isActive: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(`User does not have access permissions for clinic ID: ${clinicId}`);
    }

    request.clinicMembership = membership;
    return true;
  }
}
