import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Medals are recognition, not currency. They never pay out, so the reward
 * columns go — `points` stays as the engagement score the board is ranked on.
 */
export class AchievementsNoReward1799600000000 implements MigrationInterface {
  name = 'AchievementsNoReward1799600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "achievements"
        DROP COLUMN "reward_coins",
        DROP COLUMN "reward_gems"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "achievements"
        ADD COLUMN "reward_coins" integer NOT NULL DEFAULT 0,
        ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0
    `);
  }
}
