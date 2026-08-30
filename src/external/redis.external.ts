import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Env } from '../common/config/env';

/**
 * Shared Rewardtym Redis, namespaced by REDIS_KEY_PREFIX.
 * When REDIS_ENABLED is off every call is a safe no-op.
 */
@Injectable()
export class RedisExternal implements OnModuleDestroy {
  private readonly logger = new Logger(RedisExternal.name);
  private readonly client: Redis | null;

  constructor() {
    if (!Env.redis.enabled) {
      this.logger.warn('REDIS_ENABLED is off — caching is disabled.');
      this.client = null;
      return;
    }
    this.client = new Redis({
      host: Env.redis.host,
      port: Env.redis.port,
      username: Env.redis.username || undefined,
      password: Env.redis.password || undefined,
      db: Env.redis.db,
      tls: Env.redis.tls ? {} : undefined,
      keyPrefix: Env.redis.keyPrefix,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });
    this.client.on('error', (error) => this.logger.error(error.message));
  }

  isUsable(): boolean {
    return this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  /** Overwrites the value without resetting the key's remaining TTL. */
  async setKeepTtl(key: string, value: unknown): Promise<void> {
    if (!this.client) return;
    await this.client.set(key, JSON.stringify(value), 'KEEPTTL');
  }

  /** Returns true only for the first caller within the ttl window. */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) return true;
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}
