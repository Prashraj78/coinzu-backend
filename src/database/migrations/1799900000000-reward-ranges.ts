import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A wheel segment or scratch prize can now pay a random amount inside a range.
 * The existing reward columns stay the minimum; the new ones are the maximum.
 */
export class RewardRanges1799900000000 implements MigrationInterface {
  name = 'RewardRanges1799900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['spin_wheel_configs', 'scratch_cards']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "reward_coins_max" integer`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "reward_gems_max" integer`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['spin_wheel_configs', 'scratch_cards']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "reward_gems_max"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "reward_coins_max"`,
      );
    }
  }
}
