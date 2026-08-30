import { Injectable } from '@nestjs/common';
import { Env } from '../../common/config/env';
import { SendgridMailExternal } from '../../external/sendgrid-mail.external';
import { UsersService } from '../users/users.service';
import { LinkTokenService } from './link-token.service';
import { buildActionEmailHtml } from './mail-templates';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly usersService: UsersService,
    private readonly linkTokens: LinkTokenService,
    private readonly mailer: SendgridMailExternal,
  ) {}

  /** Silently no-ops for an unknown email so the response never reveals whether it's registered. */
  async requestReset(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) return;

    const token = await this.linkTokens.issue('reset_password', {
      cz_user_id: user.cz_user_id,
      email: normalized,
    });
    const resetUrl = `${Env.urls.api}/api/auth/password/reset?token=${token}`;

    await this.mailer.send(
      normalized,
      'Reset your Coinzu password',
      `Reset your password: ${resetUrl}\n\nThis link expires in ${Env.linkToken.ttlMinutes} minutes.`,
      buildActionEmailHtml({
        heading: 'Reset your password',
        lines: [
          'We received a request to reset your Coinzu password. Tap the button below to choose a new one.',
          "If you didn't ask for this, your account is still safe — just ignore this email.",
        ],
        buttonLabel: 'Reset password',
        buttonUrl: resetUrl,
        footnote: `This link expires in ${Env.linkToken.ttlMinutes} minutes and can only be used once.`,
      }),
    );
  }

  /** Consumes the token and sets the new password. Throws LINK_EXPIRED via LinkTokenService. */
  async confirmReset(token: string, password: string): Promise<void> {
    const payload = await this.linkTokens.consume('reset_password', token);
    await this.usersService.setPassword(payload.cz_user_id, password);
  }

  tokenIsValid(token: string): Promise<boolean> {
    return this.linkTokens.exists('reset_password', token);
  }
}
