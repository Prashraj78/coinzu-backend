import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the flat referral_reward_coins / referral_qualify_offers settings
 * with an admin-editable rule ladder. The old values are carried across as the
 * first rule so the programme keeps paying exactly as it did.
 */
export class ReferralRewardRules1798600000000 implements MigrationInterface {
  name = 'ReferralRewardRules1798600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "referral_reward_rules" (
        "cz_referral_rule_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trigger" character varying(30) NOT NULL,
        "threshold" integer NOT NULL DEFAULT 1,
        "reward_coins" integer NOT NULL DEFAULT 0,
        "label" character varying(120),
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_reward_rules" PRIMARY KEY ("cz_referral_rule_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_referral_reward_rules_trigger" ON "referral_reward_rules" ("trigger")`,
    );

    await queryRunner.query(`
      CREATE TABLE "referral_reward_payouts" (
        "cz_referral_payout_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referral_id" uuid NOT NULL,
        "referrer_id" uuid NOT NULL,
        "trigger" character varying(30) NOT NULL,
        "rule_id" uuid,
        "reward_coins" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_referral_reward_payouts" PRIMARY KEY ("cz_referral_payout_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_referral_reward_payouts_referral" ON "referral_reward_payouts" ("referral_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_referral_reward_payouts_referral_trigger" ON "referral_reward_payouts" ("referral_id", "trigger")`,
    );

    // Carry the old flat settings over as the first rule.
    const reward = await queryRunner.query(
      `SELECT setting_value FROM "app_settings" WHERE setting_key = 'referral_reward_coins'`,
    );
    const offers = await queryRunner.query(
      `SELECT setting_value FROM "app_settings" WHERE setting_key = 'referral_qualify_offers'`,
    );
    const rewardCoins = Number(reward?.[0]?.setting_value ?? 500) || 500;
    const qualifyOffers = Number(offers?.[0]?.setting_value ?? 1) || 1;

    await queryRunner.query(
      `INSERT INTO "referral_reward_rules"
         ("trigger", "threshold", "reward_coins", "label", "display_order", "is_active")
       VALUES ('offers_completed', $1, $2, $3, 0, true)`,
      [
        qualifyOffers,
        rewardCoins,
        `Friend completes ${qualifyOffers} offer${qualifyOffers === 1 ? '' : 's'}`,
      ],
    );

    await queryRunner.query(
      `DELETE FROM "app_settings" WHERE setting_key IN ('referral_reward_coins', 'referral_qualify_offers', 'offer_sync_enabled')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "referral_reward_payouts"`);
    await queryRunner.query(`DROP TABLE "referral_reward_rules"`);
  }
}
