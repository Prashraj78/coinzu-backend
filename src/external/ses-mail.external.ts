import { Injectable, Logger } from '@nestjs/common';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { Env } from '../common/config/env';
import { TELEGRAM_EMAIL_DOMAIN } from './telegram-auth.external';

/**
 * Transactional email over Amazon SES, from the same no-reply@rewardtym.online
 * identity RewardTym sends with. Everything SES needs lives in this file. With
 * no AWS credentials configured the message is logged instead of sent.
 */
@Injectable()
export class SesMailExternal {
  private readonly logger = new Logger(SesMailExternal.name);
  private readonly client = new SESv2Client({
    region: Env.mail.sesRegion,
    credentials: {
      accessKeyId: Env.aws.accessKeyId,
      secretAccessKey: Env.aws.secretAccessKey,
    },
  });

  async send(to: string, subject: string, body: string, html?: string): Promise<void> {
    if (to.endsWith(`@${TELEGRAM_EMAIL_DOMAIN}`)) return;
    if (!Env.aws.accessKeyId || !Env.aws.secretAccessKey) {
      this.logger.log(`[email -> ${to}] ${subject}: ${body}`);
      return;
    }

    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: `${Env.mail.fromName} <${Env.mail.fromAddress}>`,
          ReplyToAddresses: [Env.mail.replyToAddress],
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: {
                Text: { Data: body, Charset: 'UTF-8' },
                Html: { Data: html ?? this.toHtml(body), Charset: 'UTF-8' },
              },
            },
          },
        }),
      );
    } catch (error) {
      this.logger.error(`SES send to ${to} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Plain text to a readable HTML body. No template engine, no shared util. */
  private toHtml(body: string): string {
    const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paragraphs = escaped
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
      .join('');
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">${paragraphs}</div>`;
  }
}
