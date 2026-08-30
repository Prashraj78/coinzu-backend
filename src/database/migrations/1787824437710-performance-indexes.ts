import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes for every hot query that previously fell back to a full table scan.
 * Partial indexes (WHERE ...) only carry the rows those queries can ever
 * match, so they stay small on tables that keep growing.
 */
const INDEXES: Array<[name: string, create: string]> = [
  // Leaderboard: SUM(amount) per user over coin earns, optionally time-bound.
  [
    'idx_wallet_tx_leaderboard',
    `CREATE INDEX "idx_wallet_tx_leaderboard" ON "wallet_transactions" ("currency", "type", "created_at") INCLUDE ("user_id", "amount")`,
  ],
  // My-offers list joins completions by click id.
  [
    'idx_offer_completions_click',
    `CREATE INDEX "idx_offer_completions_click" ON "offer_completions" ("offer_click_id")`,
  ],
  // Google sign-in looks a user up by google_id on every login.
  [
    'idx_users_google_id',
    `CREATE INDEX "idx_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL`,
  ],
  // Offer feed: active offers ordered by reward.
  [
    'idx_offers_active_reward',
    `CREATE INDEX "idx_offers_active_reward" ON "offers" ("reward_coins" DESC) WHERE "is_active" = true`,
  ],
  // Nightly expiry sweep on active offers.
  [
    'idx_offers_active_expiry',
    `CREATE INDEX "idx_offers_active_expiry" ON "offers" ("expires_at") WHERE "is_active" = true`,
  ],
  // My lucky-draw entries, newest first.
  [
    'idx_lucky_draw_entries_user',
    `CREATE INDEX "idx_lucky_draw_entries_user" ON "lucky_draw_entries" ("user_id", "purchased_at")`,
  ],
  // Redeem catalog: active products, featured first, cheapest first.
  [
    'idx_gift_card_products_catalog',
    `CREATE INDEX "idx_gift_card_products_catalog" ON "gift_card_products" ("is_featured" DESC, "price_coins") WHERE "is_active" = true`,
  ],
  // 5-minute cron polls pending orders.
  [
    'idx_gift_card_orders_pending',
    `CREATE INDEX "idx_gift_card_orders_pending" ON "gift_card_orders" ("created_at") WHERE "status" = 'pending'`,
  ],
  // Open-draw list and the 10-minute resolver cron.
  [
    'idx_lucky_draws_status_date',
    `CREATE INDEX "idx_lucky_draws_status_date" ON "lucky_draws" ("status", "draw_date")`,
  ],
  // Unread badge count: only unread rows matter.
  [
    'idx_notifications_unread',
    `CREATE INDEX "idx_notifications_unread" ON "notifications" ("user_id") WHERE "read_at" IS NULL`,
  ],
  // Broadcast notifications (user_id IS NULL) merged into every inbox.
  [
    'idx_notifications_broadcast',
    `CREATE INDEX "idx_notifications_broadcast" ON "notifications" ("created_at") WHERE "user_id" IS NULL`,
  ],
  // Daily challenges are read per user per day; date is third in the unique
  // index so it could not help these lookups.
  [
    'idx_challenge_progress_user_date',
    `CREATE INDEX "idx_challenge_progress_user_date" ON "user_challenge_progress" ("user_id", "date")`,
  ],
  // Nightly click retention delete.
  [
    'idx_offer_clicks_clicked_at',
    `CREATE INDEX "idx_offer_clicks_clicked_at" ON "offer_clicks" ("clicked_at")`,
  ],
  // Admin queues filtered by status, newest first.
  [
    'idx_kyc_status_created',
    `CREATE INDEX "idx_kyc_status_created" ON "kyc_verifications" ("status", "created_at")`,
  ],
  [
    'idx_withdrawals_status_created',
    `CREATE INDEX "idx_withdrawals_status_created" ON "withdrawal_requests" ("status", "created_at")`,
  ],
  [
    'idx_tickets_status_created',
    `CREATE INDEX "idx_tickets_status_created" ON "support_tickets" ("status", "created_at")`,
  ],
];

export class PerformanceIndexes1787824437710 implements MigrationInterface {
  name = 'PerformanceIndexes1787824437710';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [, create] of INDEXES) {
      await queryRunner.query(create.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS'));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name] of INDEXES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`);
    }
  }
}
