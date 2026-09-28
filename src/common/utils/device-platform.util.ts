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

const UNKNOWN_COUNTRY = new Set(['XX', 'T1', 'ZZ', 'A1', 'A2']);

/** Normalize to ISO-3166 alpha-2, or null when it is not a real country code. */
export function normalizeCountryCode(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || UNKNOWN_COUNTRY.has(code)) return null;
  return code;
}

/**
 * Country from request headers only — CDN / edge signals first, then an
 * explicit client header. Same order Rewardtym uses. Null when none present.
 */
export function resolveCountryFromRequestHeaders(req: Request): string | null {
  const candidates = [
    req.headers['cf-ipcountry'],
    req.headers['cloudfront-viewer-country'],
    req.headers['x-vercel-ip-country'],
    req.headers['x-country-code'],
    req.headers['x-appengine-country'],
    req.headers['x-geo-country'],
    req.headers['geo-country'],
  ];

  for (const raw of candidates) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const code = normalizeCountryCode(
      typeof value === 'string' ? value : undefined,
    );
    if (code) return code;
  }
  return null;
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
