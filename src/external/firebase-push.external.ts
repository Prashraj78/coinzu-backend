import { Injectable, Logger } from '@nestjs/common';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { Env } from '../common/config/env';

export interface PushMessage {
  title: string;
  body: string;
  image_url?: string | null;
  /** Where the app should go when the notification is tapped. */
  deep_link?: string | null;
  /** Extra key/values delivered alongside. Values must be strings for FCM. */
  data?: Record<string, string>;
  /** `high` wakes a dozing device; `normal` waits for the next window. */
  priority?: 'high' | 'normal';
  /** How long FCM keeps retrying an offline device, in seconds. */
  ttl_seconds?: number | null;
  /** Later messages with the same key replace an undelivered earlier one. */
  collapse_key?: string | null;
  android_channel_id?: string | null;
  sound?: string | null;
  badge?: number | null;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  /** Tokens FCM says are dead. The caller clears these from user_devices. */
  invalid_tokens: string[];
  /** True when no credentials are configured and nothing actually left the box. */
  dry_run: boolean;
}

/** Named so a second Nest instance in the same process cannot clash. */
const APP_NAME = 'coinzu-push';

/** FCM caps one sendEach call at 500 messages. */
const BATCH_SIZE = 500;

/** Token is dead: the app was uninstalled, or the token was replaced. */
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Everything Firebase Cloud Messaging. The rest of the codebase never imports
 * firebase-admin, so swapping vendor touches this file alone.
 *
 * Without credentials this reports a dry run rather than throwing, so the push
 * module is fully usable before the Firebase project exists.
 */
@Injectable()
export class FirebasePushExternal {
  private readonly logger = new Logger(FirebasePushExternal.name);
  private app: App | null = null;

  private client(): Messaging | null {
    if (!Env.firebase.enabled) return null;
    if (!this.app) {
      const existing = getApps().find((a) => a.name === APP_NAME);
      this.app =
        existing ??
        initializeApp(
          {
            credential: cert({
              projectId: Env.firebase.projectId,
              clientEmail: Env.firebase.clientEmail,
              privateKey: Env.firebase.privateKey,
            }),
          },
          APP_NAME,
        );
    }
    return getMessaging(this.app);
  }

  get isConfigured(): boolean {
    return Env.firebase.enabled;
  }

  /** Turns our message shape into the per-platform payload FCM expects. */
  private build(message: PushMessage) {
    const priority = message.priority ?? 'high';
    const sound = message.sound ?? 'default';
    return {
      notification: {
        title: message.title,
        body: message.body,
        ...(message.image_url ? { imageUrl: message.image_url } : {}),
      },
      data: {
        ...(message.data ?? {}),
        ...(message.deep_link ? { deep_link: message.deep_link } : {}),
      },
      android: {
        priority,
        ...(message.collapse_key ? { collapseKey: message.collapse_key } : {}),
        ...(message.ttl_seconds != null ? { ttl: message.ttl_seconds * 1000 } : {}),
        notification: {
          sound,
          ...(message.android_channel_id
            ? { channelId: message.android_channel_id }
            : {}),
        },
      },
      apns: {
        headers: {
          'apns-priority': priority === 'high' ? '10' : '5',
          ...(message.collapse_key ? { 'apns-collapse-id': message.collapse_key } : {}),
          ...(message.ttl_seconds != null
            ? {
                'apns-expiration': String(
                  Math.floor(Date.now() / 1000) + message.ttl_seconds,
                ),
              }
            : {}),
        },
        payload: {
          aps: {
            sound,
            contentAvailable: true,
            ...(message.badge != null ? { badge: message.badge } : {}),
          },
        },
      },
    };
  }

  /**
   * Sends one message to many device tokens, in batches. One dead token never
   * fails the batch: FCM reports per-token outcomes and we collect them.
   */
  async sendToTokens(
    tokens: string[],
    message: PushMessage,
  ): Promise<PushSendResult> {
    const unique = [...new Set(tokens.filter(Boolean))];
    if (!unique.length) {
      return { sent: 0, failed: 0, invalid_tokens: [], dry_run: !this.isConfigured };
    }

    const messaging = this.client();
    if (!messaging) {
      this.logger.warn(
        `Firebase is not configured; dry run for ${unique.length} tokens.`,
      );
      return {
        sent: 0,
        failed: 0,
        invalid_tokens: [],
        dry_run: true,
      };
    }

    let sent = 0;
    let failed = 0;
    const invalid_tokens: string[] = [];

    for (let start = 0; start < unique.length; start += BATCH_SIZE) {
      const batch = unique.slice(start, start + BATCH_SIZE);
      try {
        const res = await messaging.sendEach(
          batch.map((token) => ({ token, ...this.build(message) })),
        );

        sent += res.successCount;
        failed += res.failureCount;
        res.responses.forEach((r, i) => {
          const code = (r.error as { code?: string } | undefined)?.code;
          if (!r.success && code && DEAD_TOKEN_CODES.has(code)) {
            invalid_tokens.push(batch[i]);
          }
        });
      } catch (error) {
        // A whole batch failing is a transport problem, not a bad token.
        failed += batch.length;
        this.logger.error(`FCM batch failed: ${String(error)}`);
      }
    }

    return { sent, failed, invalid_tokens, dry_run: false };
  }
}
