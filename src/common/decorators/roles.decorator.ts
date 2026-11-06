import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRole | string)[]) => SetMetadata(ROLES_KEY, roles);
