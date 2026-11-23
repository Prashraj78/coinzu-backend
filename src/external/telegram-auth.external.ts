import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { createPublicKey, type JsonWebKey, type KeyObject } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { Env } from '../common/config/env';
import { CzAuthErrorCodes } from '../common/errors/error.constants';

/** Telegram accounts get `tg<id>@` this as their email: .invalid is reserved and never routable, and mail to it is skipped. */
export const TELEGRAM_EMAIL_DOMAIN = 'telegram.coinzu.invalid';

const ISSUER = 'https://oauth.telegram.org';
const JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const TOKEN_URL = 'https://oauth.telegram.org/token';
/** Telegram's signing keys rarely rotate; refetched after this or when a token names an unknown key. */
const JWKS_TTL_MS = 60 * 60 * 1000;

export interface TelegramProfile {
  telegram_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface TelegramClaims extends jwt.JwtPayload {
  id?: number;
  name?: string;
  preferred_username?: string;
  picture?: string;
  nonce?: string;
}

/**
 * Telegram Login (core.telegram.org/bots/telegram-login): the web gets an OIDC `id_token` signed by Telegram.
 * It is verified against Telegram's JWKS with iss = https://oauth.telegram.org and aud = the bot's Client ID.
 */
@Injectable()
export class TelegramAuthExternal {
  private readonly logger = new Logger(TelegramAuthExternal.name);
  private keys = new Map<string, KeyObject>();
  private keysAt = 0;

  async verify(idToken: string, nonce?: string): Promise<TelegramProfile> {
    const clientId = Env.telegram.loginClientId?.trim();
    if (!clientId) {
      throw new ServiceUnavailableException({ cz_error_code: CzAuthErrorCodes.TELEGRAM_LOGIN_UNAVAILABLE });
    }

    let claims: TelegramClaims;
    try {
      const kid = jwt.decode(idToken, { complete: true })?.header.kid;
      const key = await this.keyFor(kid);
      claims = jwt.verify(idToken, key, {
        issuer: ISSUER,
        audience: clientId,
        algorithms: ['RS256', 'ES256'],
      }) as TelegramClaims;
      if (nonce && claims.nonce !== nonce) throw new Error('nonce mismatch');
    } catch (error) {
      this.logger.warn(`Telegram token rejected: ${(error as Error).message}`);
      throw new UnauthorizedException({ cz_error_code: CzAuthErrorCodes.TELEGRAM_AUTH_INVALID });
    }

    const telegramId = claims.id ?? claims.sub;
    if (!telegramId) {
      throw new UnauthorizedException({ cz_error_code: CzAuthErrorCodes.TELEGRAM_AUTH_INVALID });
    }
    return {
      telegram_id: String(telegramId),
      name: claims.name?.trim() || null,
      username: claims.preferred_username ?? null,
      avatar_url: claims.picture ?? null,
    };
  }

  /** Popup login sends an id_token; same-tab login on phones sends an authorization code. */
  profileFrom(dto: { id_token?: string; nonce?: string; code?: string; code_verifier?: string; redirect_uri?: string }): Promise<TelegramProfile> {
    if (dto.code && dto.code_verifier && dto.redirect_uri) return this.verifyCode(dto.code, dto.code_verifier, dto.redirect_uri);
    return this.verify(dto.id_token ?? '', dto.nonce);
  }

  /**
   * Same-tab login (phones): trades the authorization code for an id_token at Telegram's token endpoint
   * (Basic auth with the Client ID and Secret, PKCE verifier), then verifies it like the popup's token.
   */
  async verifyCode(code: string, codeVerifier: string, redirectUri: string): Promise<TelegramProfile> {
    const clientId = Env.telegram.loginClientId?.trim();
    const secret = Env.telegram.loginClientSecret?.trim();
    if (!clientId || !secret) {
      throw new ServiceUnavailableException({ cz_error_code: CzAuthErrorCodes.TELEGRAM_LOGIN_UNAVAILABLE });
    }
    let idToken: string | undefined;
    try {
      const { data } = await axios.post<{ id_token?: string }>(
        TOKEN_URL,
        new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
          },
          timeout: 8000,
        },
      );
      idToken = data.id_token;
    } catch (error) {
      const detail = axios.isAxiosError(error) ? JSON.stringify(error.response?.data ?? error.message) : String(error);
      this.logger.warn(`Telegram code exchange failed: ${detail}`);
    }
    if (!idToken) {
      throw new UnauthorizedException({ cz_error_code: CzAuthErrorCodes.TELEGRAM_AUTH_INVALID });
    }
    return this.verify(idToken);
  }

  private async keyFor(kid?: string): Promise<KeyObject> {
    const stale = Date.now() - this.keysAt > JWKS_TTL_MS;
    if (stale || !kid || !this.keys.has(kid)) await this.loadKeys();
    const key = kid ? this.keys.get(kid) : this.keys.values().next().value;
    if (!key) throw new Error(`no Telegram signing key for kid ${kid ?? '(none)'}`);
    return key;
  }

  private async loadKeys(): Promise<void> {
    const { data } = await axios.get<{ keys: (JsonWebKey & { kid?: string })[] }>(JWKS_URL, { timeout: 8000 });
    const next = new Map<string, KeyObject>();
    for (const jwk of data.keys ?? []) {
      if (jwk.kid) next.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
    }
    this.keys = next;
    this.keysAt = Date.now();
  }
}
