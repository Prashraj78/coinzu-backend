import { Logger } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

// The whole backend runs on UTC. Set before anything reads a clock.
process.env.TZ = 'UTC';

const logger = new Logger('Env');

function str(name: string, fallback = ''): string {
  const value = process.env[name];
  return value != null && value.trim() !== '' ? value.trim() : fallback;
}

function num(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback = false): boolean {
  const value = str(name);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function list(name: string, fallback: string[]): string[] {
  const value = str(name);
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

const NODE_ENV = str('NODE_ENV', 'development');
const IS_PRODUCTION = NODE_ENV === 'production';

/** Logged at boot so misconfiguration is obvious. */
const EXPECTED_VARS = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'DB_SSL',
  'JWT_AUTH_TOKEN',
  'JWT_REFRESH_TOKEN',
  'ENCRYPTION_KEY',
  'ADMIN_ROLES',
  'REDIS_ENABLED',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_USERNAME',
  'REDIS_PASSWORD',
  'REDIS_DB',
  'REDIS_TLS',
  'GOOGLE_CLIENT_ID',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'MAIL_FROM_ADDRESS',
  'GIFT_CARD_API_URL',
  'GIFT_CARD_API_KEY',
  'FRONTEND_URL',
  'CORS_ORIGINS',
];

export function logEnvAvailability(): void {
  const set = EXPECTED_VARS.filter((name) => str(name) !== '');
  const missing = EXPECTED_VARS.filter((name) => str(name) === '');
  logger.log(`Available (set): ${set.length} — ${set.join(', ')}`);
  if (missing.length) logger.warn(`Missing or empty: ${missing.join(', ')}`);
}

const DATABASE_URL = str('DATABASE_URL');

/** DATABASE_URL wins when set; DB_* vars remain for local runs. */
const connection = DATABASE_URL
  ? { url: DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: str('DB_HOST', 'localhost'),
      port: num('DB_PORT', 5432),
      username: str('DB_USERNAME', 'postgres'),
      password: str('DB_PASSWORD', 'postgres'),
      database: str('DB_DATABASE', 'coinzu'),
      ssl: bool('DB_SSL') ? { rejectUnauthorized: false } : false,
    };

const typeOrmConf: TypeOrmModuleOptions = {
  type: 'postgres',
  ...connection,
  entities: [__dirname + '/../../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
  // Migrations are the schema source of truth.
  synchronize: false,
  migrationsRun: false,
  logging: !IS_PRODUCTION,
  // Every session talks UTC so timestamps never shift.
  extra: { options: '-c timezone=UTC' },
};

export const Env = {
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  port: num('PORT', 4000),
  timezone: 'UTC',
  db: { typeOrmConf },
  jwt: {
    JWT_AUTH_TOKEN: str('JWT_AUTH_TOKEN'),
    JWT_REFRESH_TOKEN: str('JWT_REFRESH_TOKEN'),
    EXPIRES_IN: str('JWT_EXPIRES_IN', '150000m'),
    REFRESH_EXPIRES_IN: str('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  encryptionKey: str('ENCRYPTION_KEY'),
  /** Rewardtym roles allowed to call the Coinzu admin APIs. */
  admin: {
    roles: list('ADMIN_ROLES', ['super_admin', 'coinzu_admin']),
  },
  redis: {
    enabled: bool('REDIS_ENABLED', false),
    host: str('REDIS_HOST', 'localhost'),
    port: num('REDIS_PORT', 6379),
    username: str('REDIS_USERNAME'),
    password: str('REDIS_PASSWORD'),
    db: num('REDIS_DB', 0),
    tls: bool('REDIS_TLS', false),
    keyPrefix: str('REDIS_KEY_PREFIX', 'coinzu:'),
  },
  google: {
    clientId: str('GOOGLE_CLIENT_ID'),
  },
  r2: {
    accountId: str('R2_ACCOUNT_ID'),
    accessKeyId: str('R2_ACCESS_KEY_ID'),
    secretAccessKey: str('R2_SECRET_ACCESS_KEY'),
    bucketName: str('R2_BUCKET_NAME'),
    endpoint: str('R2_ENDPOINT'),
    publicUrl: str('R2_PUBLIC_URL'),
    maxFileBytes: num('R2_MAX_FILE_BYTES', 5 * 1024 * 1024),
  },
  aws: {
    region: str('AWS_REGION', 'us-east-1'),
    accessKeyId: str('AWS_ACCESS_KEY_ID'),
    secretAccessKey: str('AWS_SECRET_ACCESS_KEY'),
  },
  /**
   * Firebase Cloud Messaging. Absent credentials are not an error: the push
   * module runs in dry-run and records what it *would* have sent, so the
   * feature is testable before the Firebase project exists.
   */
  firebase: {
    projectId: str('FIREBASE_PROJECT_ID'),
    clientEmail: str('FIREBASE_CLIENT_EMAIL'),
    // Stored with literal \n in .env; turned back into real newlines here.
    privateKey: str('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    get enabled(): boolean {
      return Boolean(this.projectId && this.clientEmail && this.privateKey);
    },
  },
  // From name must agree with the sending domain ("Coinzu" alone did not) and
  // reply-to must be a role address, not a personal mailbox.
  sendgrid: {
    apiKey: str('SENDGRID_API_KEY'),
    fromAddress: str('SENDGRID_FROM_ADDRESS', 'no-reply@rewardtym.online'),
    fromName: str('SENDGRID_FROM_NAME', 'Coinzu by RewardTym'),
    replyToAddress: str('SENDGRID_REPLY_TO', 'rahul@rewardtym.online'),
  },
  giftCard: {
    apiUrl: str('GIFT_CARD_API_URL'),
    apiKey: str('GIFT_CARD_API_KEY'),
    providerName: str('GIFT_CARD_PROVIDER_NAME', 'default'),
  },
  otp: {
    length: num('OTP_LENGTH', 6),
    ttlMinutes: num('OTP_TTL_MINUTES', 10),
    maxAttempts: num('OTP_MAX_ATTEMPTS', 5),
  },
  linkToken: {
    ttlMinutes: num('LINK_TOKEN_TTL_MINUTES', 30),
  },
  urls: {
    frontend: str('FRONTEND_URL', 'http://localhost:3000'),
    api: str('API_BASE_URL', 'http://localhost:4000'),
  },
  corsOrigins: str('CORS_ORIGINS'),
  throttle: {
    ttlSeconds: num('THROTTLE_TTL', 60),
    limit: num('THROTTLE_LIMIT', 120),
  },
} as const;
