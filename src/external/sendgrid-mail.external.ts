import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Env } from '../common/config/env';

const SEND_URL = 'https://api.sendgrid.com/v3/mail/send';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Transactional email over SendGrid, on the same account Rewardtym uses.
 *
 * Everything the vendor needs lives in this file: the request, the payload
 * shape, and the plain-text-to-HTML formatting. Outside production, or with no
 * API key configured, the message is logged instead of sent.
 */
@Injectable()
export class SendgridMailExternal {
  private readonly logger = new Logger(SendgridMailExternal.name);

  async send(to: string, subject: string, body: string, html?: string): Promise<void> {
    if (!Env.isProduction || !Env.sendgrid.apiKey) {
      this.logger.log(`[email -> ${to}] ${subject}: ${body}`);
      return;
    }

    try {
      await axios.post(SEND_URL, this.buildPayload(to, subject, body, html), {
        headers: {
          Authorization: `Bearer ${Env.sendgrid.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      // Email is never worth failing the request that triggered it.
      this.logger.error(`SendGrid send to ${to} failed: ${this.reason(error)}`);
    }
  }

  /** SendGrid renders the last content entry first, so HTML goes last. */
  private buildPayload(to: string, subject: string, body: string, html?: string) {
    return {
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: Env.sendgrid.fromAddress,
        name: Env.sendgrid.fromName,
      },
      reply_to: { email: Env.sendgrid.replyToAddress },
      subject,
      content: [
        { type: 'text/plain', value: body },
        { type: 'text/html', value: html ?? this.toHtml(body) },
      ],
      categories: ['coinzu'],
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      },
    };
  }

  /** Plain text to a readable HTML body. No template engine, no shared util. */
  private toHtml(body: string): string {
    const escaped = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const paragraphs = escaped
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
      .join('');
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">${paragraphs}</div>`;
  }

  private reason(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return `${error.response?.status ?? 'no status'} ${JSON.stringify(error.response?.data ?? {})}`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
