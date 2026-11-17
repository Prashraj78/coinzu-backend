import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Where an account was created (app or web), the Telegram account for Telegram sign-in,
 * and the one chat contact a web user gives us
 * (`{ platform, value }`, e.g. WhatsApp + number).
 * Every existing account was made in the app, so the default backfills them correctly.
 */
export class SignupPlatformContacts1801200000000 implements MigrationInterface {
  name = 'SignupPlatformContacts1801200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signup_platform" varchar(10) NOT NULL DEFAULT 'app'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contact" jsonb, ADD COLUMN IF NOT EXISTS "telegram_id" varchar(32)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_telegram_id" ON "users" ("telegram_id") WHERE "telegram_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_signup_platform" ON "users" ("signup_platform")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_telegram_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_signup_platform"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "telegram_id", DROP COLUMN IF EXISTS "contact", DROP COLUMN IF EXISTS "signup_platform"`,
    );
  }
}
