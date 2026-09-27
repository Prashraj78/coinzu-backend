import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Env } from '../../common/config/env';
import { CzAuthErrorCodes } from '../../common/errors/error.constants';
import { SendgridMailExternal } from '../../external/sendgrid-mail.external';
import { RedisExternal } from '../../external/redis.external';
import { LinkTokenService } from './link-token.service';
import { buildActionEmailHtml } from './mail-templates';

/**
 * Email verification is link-only. The user gets a "Confirm my email" button
 * that opens the browser page; there is no code to type anywhere.
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly mailer: SendgridMailExternal,
    private readonly linkTokens: LinkTokenService,
    private readonly redis: RedisExternal,
  ) {}

  private cooldownKey(cz_user_id: string): string {
    return `verify_email:resend_cooldown:${cz_user_id}`;
  }

  /**
   * User-initiated resend. Enforces a per-user cooldown so the endpoint can't be
   * used to spam a mailbox; throws with the remaining wait time when it's active.
   */
  async resendVerifyLink(email: string, cz_user_id: string): Promise<void> {
    const ttlSeconds = Env.linkToken.resendCooldownMinutes * 60;
    const fresh = await this.redis.acquireLock(this.cooldownKey(cz_user_id), ttlSeconds);
    if (!fresh) {
      const remaining = await this.redis.ttl(this.cooldownKey(cz_user_id));
      throw new HttpException(
        {
          cz_error_code: CzAuthErrorCodes.VERIFICATION_RESEND_COOLDOWN,
          cz_error_description: `Resend blocked; ${remaining}s left on the cooldown.`,
          retry_after_seconds: remaining,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.sendVerifyLink(email, cz_user_id);
  }

  async sendVerifyLink(email: string, cz_user_id: string): Promise<void> {
    const token = await this.linkTokens.issue('verify_email', {
      cz_user_id,
      email,
    });
    const verifyUrl = `${Env.urls.api}/api/auth/email/verify?token=${token}`;

    await this.mailer.send(
      email,
      'Confirm your Coinzu email',
      `Confirm your email: ${verifyUrl}\n\nThis link expires in ${Env.linkToken.ttlMinutes} minutes.`,
      buildActionEmailHtml({
        heading: 'Confirm your email',
        lines: [
          "You're almost set — confirm this email address to finish setting up your Coinzu account.",
        ],
        buttonLabel: 'Confirm my email',
        buttonUrl: verifyUrl,
        footnote: `This link expires in ${Env.linkToken.ttlMinutes} minutes. If you didn't request this, you can ignore this email.`,
      }),
    );
  }
}
