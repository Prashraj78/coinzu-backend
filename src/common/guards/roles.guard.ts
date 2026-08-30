import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SUPER_ADMIN_KEY } from '../decorators/super-admin.decorator';
import { Env } from '../config/env';
import { CzAuthErrorCodes } from '../errors/error.constants';
import type {
  AuthenticatedRequest,
  RequestUser,
  UserRole,
} from '../auth/request-user.types';

/** Rewardtym's own name for the role; Coinzu only compares against it. */
const SUPER_ADMIN_ROLE = 'super_admin';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException({
        cz_error_code: CzAuthErrorCodes.FORBIDDEN,
      });
    }
    if (required.includes('admin') && !this.canOpenCoinzu(user)) {
      throw new ForbiddenException({
        cz_error_code: CzAuthErrorCodes.FORBIDDEN,
      });
    }

    const superOnly = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (superOnly && user.admin_role !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException({
        cz_error_code: CzAuthErrorCodes.FORBIDDEN,
      });
    }
    return true;
  }

  /**
   * Rewardtym decides who may open Coinzu and stamps it on the token as
   * `product_access`. Tokens issued before that claim existed fall back to the
   * old rule — the Rewardtym role must be listed in `ADMIN_ROLES` — so nobody
   * is locked out until their current token expires.
   */
  private canOpenCoinzu(user: RequestUser): boolean {
    if (user.product_access) {
      return user.product_access === 'both' || user.product_access === 'coinzu';
    }
    return Boolean(user.admin_role && Env.admin.roles.includes(user.admin_role));
  }
}
