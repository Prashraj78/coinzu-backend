import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Daily Challenges board: a fixed set of five tasks a day, a master chest
 * for finishing them all, and the pieces each task needs.
 */
export class DailyChallengesBoard1799700000000 implements MigrationInterface {
  name = 'DailyChallengesBoard1799700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A challenge can now need more than one action ("play any 2 new games").
    await queryRunner.query(`
      ALTER TABLE "daily_challenges"
        ADD COLUMN "target_count" integer NOT NULL DEFAULT 1,
        ADD COLUMN "icon_url" character varying(500),
        ADD COLUMN "action" character varying(40)
    `);

    // Progress is now a count, not just a flag.
    await queryRunner.query(
      `ALTER TABLE "user_challenge_progress" ADD COLUMN "progress" integer NOT NULL DEFAULT 0`,
    );

    // One row per user per day records whether the chest has been taken.
    await queryRunner.query(`
      CREATE TABLE "daily_chest_claims" (
        "cz_daily_chest_claim_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "reward_coins" integer NOT NULL DEFAULT 0,
        "reward_gems" integer NOT NULL DEFAULT 0,
        "claimed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_daily_chest_claims" PRIMARY KEY ("cz_daily_chest_claim_id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_daily_chest_unique" ON "daily_chest_claims" ("user_id", "date")`,
    );

    // The quiz shows a picture above the question, and can be scheduled ahead.
    await queryRunner.query(`
      ALTER TABLE "quizzes"
        ADD COLUMN "image_url" character varying(500),
        ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0,
        ADD COLUMN "grants_scratch_card" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_quizzes_date" ON "quizzes" ("date")`,
    );

    // Winning the quiz hands out a scratch card on top of the day's allowance.
    await queryRunner.query(`
      CREATE TABLE "scratch_card_grants" (
        "cz_scratch_card_grant_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "source" character varying(30) NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scratch_card_grants" PRIMARY KEY ("cz_scratch_card_grant_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_scratch_grants_user_date" ON "scratch_card_grants" ("user_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "scratch_card_grants"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_quizzes_date"`);
    await queryRunner.query(`
      ALTER TABLE "quizzes"
        DROP COLUMN "image_url",
        DROP COLUMN "reward_gems",
        DROP COLUMN "grants_scratch_card"
    `);
    await queryRunner.query(`DROP TABLE "daily_chest_claims"`);
    await queryRunner.query(
      `ALTER TABLE "user_challenge_progress" DROP COLUMN "progress"`,
    );
    await queryRunner.query(`
      ALTER TABLE "daily_challenges"
        DROP COLUMN "target_count",
        DROP COLUMN "icon_url",
        DROP COLUMN "action"
    `);
  }
}
