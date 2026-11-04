import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Env } from '../common/config/env';

const SEND_TIMEOUT_MS = 10000;
const MAX_LEN = 3800;

/**
 * Ops alerts to Telegram (gift-card orders etc). Reuses the RewardTym bot token
 * and chat id. Best-effort: a missing token or a send failure only logs — it
 * never throws into the request path.
 */
@Injectable()
export class TelegramExternal {
  private readonly logger = new Logger(TelegramExternal.name);

  async sendAlert(html: string): Promise<void> {
    const token = Env.telegram.botToken?.trim();
    const chatId = Env.telegram.chatId?.trim();
    if (!token || !chatId) {
      this.logger.warn(`[telegram skipped] ${html.replace(/<[^>]+>/g, '')}`);
      return;
    }
    const text = html.length > MAX_LEN ? `${html.slice(0, MAX_LEN)}…` : html;
    try {
      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        },
        { timeout: SEND_TIMEOUT_MS },
      );
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? (err.response?.data as { description?: string })?.description ??
          err.message
        : 'unknown error';
      this.logger.error(`Telegram alert failed: ${detail}`);
    }
  }

  /** Escape user/vendor text before putting it inside an HTML alert. */
  escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
