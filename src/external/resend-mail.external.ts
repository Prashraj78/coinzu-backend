import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Env } from '../common/config/env';
import { TELEGRAM_EMAIL_DOMAIN } from './telegram-auth.external';

const RESEND_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10000;

/**
 * Transactional email over Resend, from the no-reply@rewardtym.online domain Rewardtym sends with.
 * Everything Resend needs lives in this file. With no RESEND_API_KEY the message is logged instead of sent.
 */
@Injectable()
export class ResendMailExternal {
  private readonly logger = new Logger(ResendMailExternal.name);

  async send(to: string, subject: string, body: string, html?: string): Promise<void> {
    if (to.endsWith(`@${TELEGRAM_EMAIL_DOMAIN}`)) return;
    if (!Env.mail.resendApiKey) {
      this.logger.log(`[email -> ${to}] ${subject}: ${body}`);
      return;
    }

    try {
      await axios.post(
        RESEND_URL,
        {
          from: `${Env.mail.fromName} <${Env.mail.fromAddress}>`,
          to: [to],
          reply_to: Env.mail.replyToAddress,
          subject,
          text: body,
          html: html ?? this.toHtml(body),
        },
        { headers: { Authorization: `Bearer ${Env.mail.resendApiKey}` }, timeout: SEND_TIMEOUT_MS },
      );
    } catch (error) {
      const detail = axios.isAxiosError(error) ? JSON.stringify(error.response?.data ?? error.message) : String(error);
      this.logger.error(`Resend send to ${to} failed: ${detail}`);
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
