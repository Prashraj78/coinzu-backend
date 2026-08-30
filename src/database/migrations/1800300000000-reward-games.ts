import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Rewards screen: four cards a user buys entries into. Two are instant
 * (spin now), two are draws settled by a cron at 00:00 UTC. Everything an
 * admin needs to steer them — entry price, prize ladder, and how the pool
 * scales with turnout — lives in these tables rather than in code.
 */
export class RewardGames1800300000000 implements MigrationInterface {
  name = 'RewardGames1800300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reward_games" (
        "cz_reward_game_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying(40) NOT NULL,
        "kind" character varying(10) NOT NULL,
        "cadence" character varying(10) NOT NULL DEFAULT 'none',
        "title" character varying(120) NOT NULL,
        "subtitle" character varying(255),
        "icon_url" character varying(500),
        "headline_prize_coins" integer NOT NULL DEFAULT 0,
        "entry_cost_gems" integer NOT NULL DEFAULT 0,
        "min_entries" integer NOT NULL DEFAULT 1,
        "max_entries" integer NOT NULL DEFAULT 250,
        "entry_packs" jsonb NOT NULL DEFAULT '[]',
        "how_it_works" jsonb NOT NULL DEFAULT '[]',
        "terms_url" character varying(500),
        "status" character varying(20) NOT NULL DEFAULT 'live',
        "display_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_reward_games" PRIMARY KEY ("cz_reward_game_id"),
        CONSTRAINT "UQ_reward_games_slug" UNIQUE ("slug")
      )
    `);

    // A prize ladder for a draw (rank 1..N), or a wheel face (weighted segments).
    await queryRunner.query(`
      CREATE TABLE "reward_prizes" (
        "cz_reward_prize_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "game_id" uuid NOT NULL,
        "rank" integer NOT NULL DEFAULT 1,
        "label" character varying(60) NOT NULL,
        "reward_coins" integer NOT NULL DEFAULT 0,
        "reward_gems" integer NOT NULL DEFAULT 0,
        "probability_weight" double precision,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_reward_prizes" PRIMARY KEY ("cz_reward_prize_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_reward_prizes_game" ON "reward_prizes" ("game_id", "rank")`,
    );

    // "x participants pays out y" — the band whose floor the turnout clears wins.
    await queryRunner.query(`
      CREATE TABLE "reward_payout_rules" (
        "cz_reward_payout_rule_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "game_id" uuid NOT NULL,
        "min_participants" integer NOT NULL DEFAULT 0,
        "prize_pool_coins" integer NOT NULL DEFAULT 0,
        "winners_count" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_reward_payout_rules" PRIMARY KEY ("cz_reward_payout_rule_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_reward_payout_rules_game" ON "reward_payout_rules" ("game_id", "min_participants")`,
    );

    // One row per instant play. The mystery box will land here too.
    await queryRunner.query(`
      CREATE TABLE "reward_plays" (
        "cz_reward_play_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "game_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "prize_id" uuid,
        "label" character varying(60) NOT NULL,
        "gems_spent" integer NOT NULL DEFAULT 0,
        "reward_coins" integer NOT NULL DEFAULT 0,
        "reward_gems" integer NOT NULL DEFAULT 0,
        "played_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reward_plays" PRIMARY KEY ("cz_reward_play_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_reward_plays_user" ON "reward_plays" ("user_id", "played_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reward_plays_game" ON "reward_plays" ("game_id", "played_at")`,
    );

    // The existing draw table becomes one instance of a recurring game.
    await queryRunner.query(
      `ALTER TABLE "lucky_draws" ADD COLUMN IF NOT EXISTS "game_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "lucky_draws" ADD COLUMN IF NOT EXISTS "period_key" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "lucky_draws" ADD COLUMN IF NOT EXISTS "opens_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lucky_draws" ADD COLUMN IF NOT EXISTS "participants_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "lucky_draws" ADD COLUMN IF NOT EXISTS "entries_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "lucky_draws" ADD COLUMN IF NOT EXISTS "settled_at" TIMESTAMP WITH TIME ZONE`,
    );
    // One live draw per game per period, so the cron can never double-create.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_lucky_draws_game_period"
       ON "lucky_draws" ("game_id", "period_key")
       WHERE "game_id" IS NOT NULL AND "period_key" IS NOT NULL`,
    );

    // Entries are bought in packs, so a user has many rows per draw.
    await queryRunner.query(
      `ALTER TABLE "lucky_draw_entries" ADD COLUMN IF NOT EXISTS "entry_cost_gems" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lucky_draw_entries_draw_user"
       ON "lucky_draw_entries" ("draw_id", "user_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "lucky_draw_winners" ADD COLUMN IF NOT EXISTS "prize_gems" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "lucky_draw_winners" ADD COLUMN IF NOT EXISTS "entries_held" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_lucky_draws_game_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lucky_draw_entries_draw_user"`);
    for (const col of [
      'game_id',
      'period_key',
      'opens_at',
      'participants_count',
      'entries_count',
      'settled_at',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "lucky_draws" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "lucky_draw_entries" DROP COLUMN IF EXISTS "entry_cost_gems"`,
    );
    for (const col of ['prize_gems', 'entries_held']) {
      await queryRunner.query(
        `ALTER TABLE "lucky_draw_winners" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "reward_plays"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reward_payout_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reward_prizes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reward_games"`);
  }
}
