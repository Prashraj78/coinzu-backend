import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Env } from '../../common/config/env';
import { CzAuthErrorCodes } from '../../common/errors/error.constants';
import { RedisExternal } from '../../external/redis.external';

export type LinkTokenPurpose = 'verify_email' | 'reset_password';

export interface LinkTokenPayload {
  cz_user_id: string;
  email: string;
}

/** A single-use, 64 hex-char token — anything else is rejected before it reaches Redis. */
export const LINK_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

/** Opaque single-use tokens for the email-verify and forgot-password links sent by mail. */
@Injectable()
export class LinkTokenService {
  constructor(private readonly redis: RedisExternal) {}

  private key(purpose: LinkTokenPurpose, token: string): string {
    return `link:${purpose}:${token}`;
  }

  async issue(purpose: LinkTokenPurpose, payload: LinkTokenPayload): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.redis.set(this.key(purpose, token), payload, Env.linkToken.ttlMinutes * 60);
    return token;
  }

  /** Read-only check so a page can render its expired/invalid state without consuming the token. */
  async exists(purpose: LinkTokenPurpose, token: string): Promise<boolean> {
    if (!LINK_TOKEN_PATTERN.test(token)) return false;
    return (await this.redis.get<LinkTokenPayload>(this.key(purpose, token))) !== null;
  }

  /** Throws on a missing/expired/already-used token; deletes it on success. */
  async consume(purpose: LinkTokenPurpose, token: string): Promise<LinkTokenPayload> {
    if (!LINK_TOKEN_PATTERN.test(token)) {
      throw new BadRequestException({ cz_error_code: CzAuthErrorCodes.LINK_EXPIRED });
    }
    const key = this.key(purpose, token);
    const payload = await this.redis.get<LinkTokenPayload>(key);
    if (!payload) {
      throw new BadRequestException({ cz_error_code: CzAuthErrorCodes.LINK_EXPIRED });
    }
    await this.redis.del(key);
    return payload;
  }
}
