import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Medals get a stable slug, the emoji the app prints next to the name, and a
 * wider icon_url — the old 60-char column could not hold an R2 URL.
 */
export class AchievementMedals1799500000000 implements MigrationInterface {
  name = 'AchievementMedals1799500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "achievements" ALTER COLUMN "icon_url" TYPE character varying(500)`,
    );
    await queryRunner.query(`
      ALTER TABLE "achievements"
        ADD COLUMN "slug" character varying(60),
        ADD COLUMN "emoji" character varying(16),
        ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0,
        ADD COLUMN "display_order" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_achievements_slug" ON "achievements" ("slug") WHERE "slug" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_achievements_achievement" ON "user_achievements" ("achievement_id", "unlocked_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_achievements_achievement"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_achievements_slug"`);
    await queryRunner.query(`
      ALTER TABLE "achievements"
        DROP COLUMN "slug",
        DROP COLUMN "emoji",
        DROP COLUMN "reward_gems",
        DROP COLUMN "display_order"
    `);
  }
}
