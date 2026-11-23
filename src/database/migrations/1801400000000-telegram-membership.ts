import { MigrationInterface, QueryRunner } from 'typeorm';

/** Web users must be in the Coinzu Telegram channel. Not unique: several accounts may share one Telegram. */
export class TelegramMembership1801400000000 implements MigrationInterface {
  name = 'TelegramMembership1801400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "telegram_member_id" varchar(32),
        ADD COLUMN IF NOT EXISTS "telegram_joined_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "telegram_checked_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users"
        DROP COLUMN IF EXISTS "telegram_checked_at",
        DROP COLUMN IF EXISTS "telegram_joined_at",
        DROP COLUMN IF EXISTS "telegram_member_id"`,
    );
  }
}
