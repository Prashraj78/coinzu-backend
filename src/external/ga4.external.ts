import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Env } from '../common/config/env';

const SEND_TIMEOUT_MS = 5000;

/**
 * GA4 Measurement Protocol, for events only the server sees (a credited offer).
 * Best-effort: unconfigured or failed sends only log, never throw.
 */
@Injectable()
export class Ga4External {
  private readonly logger = new Logger(Ga4External.name);

  async sendEvent(
    userId: string,
    name: string,
    params: Record<string, string | number>,
  ): Promise<void> {
    const { measurementId, apiSecret } = Env.ga4;
    if (!measurementId || !apiSecret) return;
    try {
      await axios.post(
        'https://www.google-analytics.com/mp/collect',
        {
          // The browser's GA client id isn't known here; user_id ties the event to the signed-in user.
          client_id: userId,
          user_id: userId,
          events: [{ name, params: { ...params, engagement_time_msec: 1 } }],
        },
        {
          params: { measurement_id: measurementId, api_secret: apiSecret },
          timeout: SEND_TIMEOUT_MS,
        },
      );
    } catch (err) {
      this.logger.warn(
        `GA4 event ${name} failed: ${axios.isAxiosError(err) ? err.message : String(err)}`,
      );
    }
  }
}
