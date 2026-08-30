import { Injectable } from '@nestjs/common';
import { Env } from '../../common/config/env';
import { SendgridMailExternal } from '../../external/sendgrid-mail.external';
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
  ) {}

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
