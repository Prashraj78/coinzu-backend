import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { Env } from '../config/env';
import { CzAuthErrorCodes } from '../errors/error.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type {
  AuthenticatedRequest,
  CoinzuUserClaims,
  RequestUser,
  RewardtymAdminClaims,
} from '../auth/request-user.types';

/**
 * Verifies the bearer token and nothing else. Identity comes from the claims,
 * so a request never costs a database read.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.TOKEN_MISSING,
      });
    }

    const claims = this.verify(token);
    req.user = this.toRequestUser(claims);
    return true;
  }

  private verify(token: string): Record<string, unknown> {
    try {
      return jwt.verify(token, Env.jwt.JWT_AUTH_TOKEN) as Record<
        string,
        unknown
      >;
    } catch (error) {
      throw new UnauthorizedException({
        cz_error_code:
          error instanceof jwt.TokenExpiredError
            ? CzAuthErrorCodes.TOKEN_EXPIRED
            : CzAuthErrorCodes.TOKEN_INVALID,
      });
    }
  }

  /** Rewardtym admin tokens and Coinzu user tokens end up in the same shape. */
  private toRequestUser(claims: Record<string, unknown>): RequestUser {
    if (claims.type === 'admin') {
      const admin = claims as unknown as RewardtymAdminClaims;
      if (admin.is_active === false) {
        throw new UnauthorizedException({
          cz_error_code: CzAuthErrorCodes.TOKEN_INVALID,
        });
      }
      return {
        cz_user_id: admin.sub,
        email: admin.email,
        role: 'admin',
        admin_role: admin.role,
        product_access: admin.product_access,
      };
    }

    const user = claims as unknown as CoinzuUserClaims;
    if (!user.cz_user_id) {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.TOKEN_INVALID,
      });
    }
    return { cz_user_id: user.cz_user_id, email: user.email, role: 'user' };
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : null;
  }
}
