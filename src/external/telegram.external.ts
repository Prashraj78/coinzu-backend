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

  /** `chatId` sends to a dedicated group (e.g. withdrawals); omitted = the main ops chat. */
  async sendAlert(html: string, chatId = Env.telegram.chatId?.trim()): Promise<void> {
    const token = Env.telegram.botToken?.trim();
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

  /**
   * Whether a Telegram user is in the Coinzu channel (the bot must be its admin).
   * null when the check itself failed, so callers can decide how to treat an outage.
   */
  async isChannelMember(telegramUserId: string): Promise<boolean | null> {
    const token = Env.telegram.botToken?.trim();
    const chatId = Env.telegram.channelId?.trim();
    if (!token || !chatId) return null;
    try {
      const res = await axios.get<{ result?: { status?: string; is_member?: boolean } }>(
        `https://api.telegram.org/bot${token}/getChatMember`,
        { params: { chat_id: chatId, user_id: telegramUserId }, timeout: SEND_TIMEOUT_MS },
      );
      const member = res.data.result;
      if (!member?.status) return null;
      if (member.status === 'restricted') return member.is_member === true;
      return ['creator', 'administrator', 'member'].includes(member.status);
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? (err.response?.data as { description?: string })?.description ?? err.message
        : 'unknown error';
      // "user not found" means they never joined; anything else is an outage.
      if (/user not found|PARTICIPANT_ID_INVALID/i.test(detail)) return false;
      this.logger.warn(`Telegram member check failed: ${detail}`);
      return null;
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
