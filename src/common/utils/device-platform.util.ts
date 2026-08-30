import type { Request } from 'express';
import type { DevicePlatformType } from '../../database/entities/user-device.entity';

const PLATFORMS: DevicePlatformType[] = ['ios', 'android', 'web'];

/** Explicit client value wins, then the `X-Device-Type` header, then User-Agent sniffing. */
export function resolveDevicePlatform(
  explicit: string | undefined,
  req: Request,
): DevicePlatformType {
  if (explicit && (PLATFORMS as string[]).includes(explicit)) {
    return explicit as DevicePlatformType;
  }

  const header = req.headers['x-device-type'];
  if (typeof header === 'string' && (PLATFORMS as string[]).includes(header)) {
    return header as DevicePlatformType;
  }

  const ua = (req.headers['user-agent'] ?? '').toString().toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
}

/** Header priority mirrors Rewardtym's fraud checks — CDN edge headers first, socket last. */
export function extractRequestIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : undefined;

  const headerIp =
    req.headers['cf-connecting-ip'] ??
    req.headers['true-client-ip'] ??
    req.headers['x-real-ip'] ??
    req.headers['x-client-ip'] ??
    forwardedIp;

  if (typeof headerIp === 'string' && headerIp) return headerIp;
  return req.ip ?? req.socket.remoteAddress ?? null;
}
