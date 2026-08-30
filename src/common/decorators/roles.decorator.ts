import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../auth/request-user.types';

export const ROLES_KEY = 'czRoles';

/** Restricts a route to the given roles; enforced by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
