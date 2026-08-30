import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A streak day used to pay one currency. The 30-day board pays both, so the
 * single reward_type/reward_amount pair becomes two explicit columns.
 */
export class StreakCoinsGems1799200000000 implements MigrationInterface {
  name = 'StreakCoinsGems1799200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "streak_reward_configs"
        ADD COLUMN "reward_coins" integer NOT NULL DEFAULT 0,
        ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0,
        ADD COLUMN "label" character varying(40),
        ADD COLUMN "is_milestone" boolean NOT NULL DEFAULT false
    `);

    // Carry any existing rows over before the old columns go.
    await queryRunner.query(`
      UPDATE "streak_reward_configs"
         SET "reward_coins" = CASE WHEN "reward_type" = 'gems' THEN 0 ELSE "reward_amount" END,
             "reward_gems"  = CASE WHEN "reward_type" = 'gems' THEN "reward_amount" ELSE 0 END
    `);

    await queryRunner.query(`
      ALTER TABLE "streak_reward_configs"
        DROP COLUMN "reward_type",
        DROP COLUMN "reward_amount"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "streak_reward_configs"
        ADD COLUMN "reward_type" character varying(10) NOT NULL DEFAULT 'coins',
        ADD COLUMN "reward_amount" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "streak_reward_configs"
         SET "reward_type" = CASE WHEN "reward_gems" > 0 AND "reward_coins" = 0 THEN 'gems' ELSE 'coins' END,
             "reward_amount" = GREATEST("reward_coins", "reward_gems")
    `);
    await queryRunner.query(`
      ALTER TABLE "streak_reward_configs"
        DROP COLUMN "reward_coins",
        DROP COLUMN "reward_gems",
        DROP COLUMN "label",
        DROP COLUMN "is_milestone"
    `);
  }
}
