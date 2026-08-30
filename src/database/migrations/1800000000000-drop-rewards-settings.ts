import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Rewards & Limits configuration tab is gone. Four of its keys are retired
 * outright; the chest and scratch keys survive, edited from Daily Challenges.
 */
const RETIRED = [
  'checkin_base_coins',
  'daily_spin_limit',
  'streak_target_coins',
  'streak_target_gems',
];

export class DropRewardsSettings1800000000000 implements MigrationInterface {
  name = 'DropRewardsSettings1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "app_settings" WHERE "setting_key" = ANY($1)`,
      [RETIRED],
    );
  }

  public async down(): Promise<void> {
    // Defaults come from the code, so a re-added key needs no row.
  }
}
