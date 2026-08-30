import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The quiz pays no currency — a correct answer wins a scratch card and nothing
 * else, and the card is now the only way to get one. The free daily allowance
 * goes with it. quiz_attempts.reward_coins is kept: it is history.
 */
export class QuizCardOnly1800200000000 implements MigrationInterface {
  name = 'QuizCardOnly1800200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "reward_coins"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "reward_gems"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "grants_scratch_card"`,
    );
    await queryRunner.query(
      `DELETE FROM "app_settings" WHERE "setting_key" = 'daily_scratch_limit'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD COLUMN "reward_coins" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD COLUMN "reward_gems" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "quizzes" ADD COLUMN "grants_scratch_card" boolean NOT NULL DEFAULT true`,
    );
  }
}
