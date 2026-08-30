import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A payout band belongs to the scratch card alone. A wheel segment shows the
 * user what it is worth before they spin, so it pays exactly that.
 */
export class WheelDropRanges1800100000000 implements MigrationInterface {
  name = 'WheelDropRanges1800100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spin_wheel_configs" DROP COLUMN IF EXISTS "reward_coins_max"`,
    );
    await queryRunner.query(
      `ALTER TABLE "spin_wheel_configs" DROP COLUMN IF EXISTS "reward_gems_max"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spin_wheel_configs" ADD COLUMN "reward_coins_max" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "spin_wheel_configs" ADD COLUMN "reward_gems_max" integer`,
    );
  }
}
