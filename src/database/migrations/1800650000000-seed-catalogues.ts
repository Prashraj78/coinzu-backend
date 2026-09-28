import { MigrationInterface, QueryRunner } from 'typeorm';
import { MEDAL_SEEDS } from '../seeds/achievement-medals.seed';

/**
 * Daily challenge tiles, reward games and achievement medals have no create
 * endpoint — admins only edit existing rows — so a fresh database showed empty
 * screens. Each block inserts the shipped catalogue only when its table is
 * empty, so databases that already hold admin-tuned rows are left untouched.
 */
export class SeedCatalogues1800650000000 implements MigrationInterface {
  name = 'SeedCatalogues1800650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "daily_challenges" ("type", "title", "description", "reward_coins", "reward_gems", "target_count", "action", "display_order")
      SELECT * FROM (VALUES
        ('spin', 'Spin the Lucky Wheel', 'Spin the wheel 1 time', 50, 0, 1, 'spin', 1),
        ('quiz', 'Take the Quiz', 'Answer the daily quiz question', 50, 0, 1, 'quiz', 2),
        ('game_install', 'Play Any 2 New Games', 'Install and play any 2 new games', 200, 0, 2, 'offers', 3),
        ('invite', 'Invite a Friend', 'Invite a friend to Coinzu', 300, 0, 1, 'referrals', 4),
        ('offer', 'Complete Any Offer', 'Complete any 1 offer', 200, 0, 1, 'offers', 5)
      ) AS v
      WHERE NOT EXISTS (SELECT 1 FROM "daily_challenges")
    `);

    await queryRunner.query(`
      INSERT INTO "reward_games" ("slug", "kind", "cadence", "title", "headline_prize_coins", "entry_cost_gems", "entry_packs", "status", "display_order")
      SELECT v.slug, v.kind, v.cadence, v.title, v.prize, v.cost, v.packs::jsonb, v.status, v.ord FROM (VALUES
        ('wheel_of_fortune', 'instant', 'none', 'Wheel of Fortune', 10000, 10, '[]', 'live', 1),
        ('daily_lucky_draw', 'draw', 'daily', 'Daily Lucky Draw', 5000, 10, '[1, 5, 10, 25]', 'live', 2),
        ('mystery_box', 'instant', 'none', 'Mystery Box', 5000, 20, '[]', 'coming_soon', 3),
        ('weekly_lucky_draw', 'draw', 'weekly', 'Weekly Lucky Draw', 50000, 25, '[1, 5, 10, 25]', 'live', 4)
      ) AS v(slug, kind, cadence, title, prize, cost, packs, status, ord)
      WHERE NOT EXISTS (SELECT 1 FROM "reward_games")
    `);

    // Instant games draw a weighted prize; draws pay ranked prizes from a pool that grows with turnout.
    await queryRunner.query(`
      INSERT INTO "reward_prizes" ("game_id", "rank", "label", "reward_coins", "reward_gems", "probability_weight")
      SELECT g."cz_reward_game_id", p.rank, p.label, p.coins, p.gems, p.weight
      FROM "reward_games" g
      JOIN (VALUES
        ('wheel_of_fortune', 1, '10,000 Coins', 10000, 0, 1::float),
        ('wheel_of_fortune', 2, '1,000 Coins', 1000, 0, 9),
        ('wheel_of_fortune', 3, '250 Coins', 250, 0, 30),
        ('wheel_of_fortune', 4, '50 Gems', 0, 50, 20),
        ('wheel_of_fortune', 5, 'Better luck', 0, 0, 40),
        ('mystery_box', 1, '5,000 Coins', 5000, 0, 2),
        ('mystery_box', 2, '500 Coins', 500, 0, 38),
        ('mystery_box', 3, 'Better luck', 0, 0, 60),
        ('daily_lucky_draw', 1, 'Grand prize', 5000, 0, NULL),
        ('weekly_lucky_draw', 1, 'Grand prize', 50000, 0, NULL)
      ) AS p(slug, rank, label, coins, gems, weight) ON p.slug = g."slug"
      WHERE NOT EXISTS (SELECT 1 FROM "reward_prizes")
    `);
    await queryRunner.query(`
      INSERT INTO "reward_payout_rules" ("game_id", "min_participants", "prize_pool_coins", "winners_count")
      SELECT g."cz_reward_game_id", r.min, r.pool, r.winners
      FROM "reward_games" g
      JOIN (VALUES
        ('daily_lucky_draw', 0, 1000, 1),
        ('daily_lucky_draw', 50, 5000, 3),
        ('weekly_lucky_draw', 0, 10000, 1),
        ('weekly_lucky_draw', 200, 50000, 5)
      ) AS r(slug, min, pool, winners) ON r.slug = g."slug"
      WHERE NOT EXISTS (SELECT 1 FROM "reward_payout_rules")
    `);

    const empty = await queryRunner.query(`SELECT NOT EXISTS (SELECT 1 FROM "achievements") AS empty`);
    if (!empty[0].empty) return;
    for (const [i, m] of MEDAL_SEEDS.entries()) {
      await queryRunner.query(
        `INSERT INTO "achievements" ("slug", "title", "emoji", "description", "criteria_type", "criteria_value", "rarity", "points", "display_order")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [m.slug, m.title, m.emoji, m.description, m.criteria_type, m.criteria_value, m.rarity, m.points, i + 1],
      );
    }
  }

  // Seed rows may have been edited or referenced since, so nothing is deleted on revert.
  public async down(): Promise<void> {}
}
