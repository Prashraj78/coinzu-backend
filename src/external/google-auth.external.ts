import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { Env } from '../common/config/env';
import { CzAuthErrorCodes } from '../common/errors/error.constants';

export interface GoogleProfile {
  google_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
}

/** Google Sign-In token verification. */
@Injectable()
export class GoogleAuthExternal {
  private readonly logger = new Logger(GoogleAuthExternal.name);
  private readonly client = new OAuth2Client(Env.google.clientId);

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: Env.google.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new Error('Google token carried no email.');
      }
      return {
        google_id: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        avatar_url: payload.picture ?? null,
        email_verified: Boolean(payload.email_verified),
      };
    } catch (error) {
      this.logger.warn(`Google token rejected: ${(error as Error).message}`);
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.GOOGLE_TOKEN_INVALID,
      });
    }
  }
}
