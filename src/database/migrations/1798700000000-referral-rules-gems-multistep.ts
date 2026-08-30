import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Opens the ladder up: gems alongside coins, and as many steps per trigger as
 * the admin wants. Payout uniqueness moves from (referral, trigger) to
 * (referral, rule) so two `offers_completed` steps can both pay.
 */
export class ReferralRulesGemsMultistep1798700000000
  implements MigrationInterface
{
  name = 'ReferralRulesGemsMultistep1798700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "referral_reward_rules" ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0`,
    );

    // Older payout rows predate rule_id being meaningful; back-fill from the
    // one rule that owned each trigger so the new unique index can be built.
    await queryRunner.query(`
      UPDATE "referral_reward_payouts" p
      SET "rule_id" = r."cz_referral_rule_id"
      FROM "referral_reward_rules" r
      WHERE p."rule_id" IS NULL AND r."trigger" = p."trigger"
    `);
    await queryRunner.query(
      `DELETE FROM "referral_reward_payouts" WHERE "rule_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_reward_payouts" ALTER COLUMN "rule_id" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "referral_reward_payouts" ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_referral_reward_payouts_referral_trigger"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_referral_reward_payouts_referral_rule" ON "referral_reward_payouts" ("referral_id", "rule_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_referral_reward_payouts_referral_rule"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_referral_reward_payouts_referral_trigger" ON "referral_reward_payouts" ("referral_id", "trigger")`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_reward_payouts" DROP COLUMN "reward_gems"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_reward_payouts" ALTER COLUMN "rule_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referral_reward_rules" DROP COLUMN "reward_gems"`,
    );
  }
}
