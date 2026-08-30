import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the `cz_` prefix from every table name. Columns keep theirs — the
 * primary keys stay `cz_<entity>_id`, which is what the API already returns.
 * Indexes and constraints follow the table automatically, so only the table
 * names move.
 */
export class DropTablePrefix1787824437708 implements MigrationInterface {
  name = 'DropTablePrefix1787824437708';

  private readonly renames: string[] = [
    `ALTER TABLE IF EXISTS "cz_achievements" RENAME TO "achievements"`,
    `ALTER TABLE IF EXISTS "cz_app_settings" RENAME TO "app_settings"`,
    `ALTER TABLE IF EXISTS "cz_cron_job_logs" RENAME TO "cron_job_logs"`,
    `ALTER TABLE IF EXISTS "cz_daily_challenges" RENAME TO "daily_challenges"`,
    `ALTER TABLE IF EXISTS "cz_daily_checkins" RENAME TO "daily_checkins"`,
    `ALTER TABLE IF EXISTS "cz_faq_categories" RENAME TO "faq_categories"`,
    `ALTER TABLE IF EXISTS "cz_faqs" RENAME TO "faqs"`,
    `ALTER TABLE IF EXISTS "cz_gift_card_orders" RENAME TO "gift_card_orders"`,
    `ALTER TABLE IF EXISTS "cz_gift_card_products" RENAME TO "gift_card_products"`,
    `ALTER TABLE IF EXISTS "cz_kyc_verifications" RENAME TO "kyc_verifications"`,
    `ALTER TABLE IF EXISTS "cz_lucky_draw_entries" RENAME TO "lucky_draw_entries"`,
    `ALTER TABLE IF EXISTS "cz_lucky_draw_winners" RENAME TO "lucky_draw_winners"`,
    `ALTER TABLE IF EXISTS "cz_lucky_draws" RENAME TO "lucky_draws"`,
    `ALTER TABLE IF EXISTS "cz_notifications" RENAME TO "notifications"`,
    `ALTER TABLE IF EXISTS "cz_offer_clicks" RENAME TO "offer_clicks"`,
    `ALTER TABLE IF EXISTS "cz_offer_completions" RENAME TO "offer_completions"`,
    `ALTER TABLE IF EXISTS "cz_offers" RENAME TO "offers"`,
    `ALTER TABLE IF EXISTS "cz_offerwall_providers" RENAME TO "offerwall_providers"`,
    `ALTER TABLE IF EXISTS "cz_otp_codes" RENAME TO "otp_codes"`,
    `ALTER TABLE IF EXISTS "cz_quiz_attempts" RENAME TO "quiz_attempts"`,
    `ALTER TABLE IF EXISTS "cz_quizzes" RENAME TO "quizzes"`,
    `ALTER TABLE IF EXISTS "cz_referral_tier_configs" RENAME TO "referral_tier_configs"`,
    `ALTER TABLE IF EXISTS "cz_referrals" RENAME TO "referrals"`,
    `ALTER TABLE IF EXISTS "cz_scratch_cards" RENAME TO "scratch_cards"`,
    `ALTER TABLE IF EXISTS "cz_scratch_history" RENAME TO "scratch_history"`,
    `ALTER TABLE IF EXISTS "cz_spin_history" RENAME TO "spin_history"`,
    `ALTER TABLE IF EXISTS "cz_spin_wheel_configs" RENAME TO "spin_wheel_configs"`,
    `ALTER TABLE IF EXISTS "cz_streak_reward_configs" RENAME TO "streak_reward_configs"`,
    `ALTER TABLE IF EXISTS "cz_support_tickets" RENAME TO "support_tickets"`,
    `ALTER TABLE IF EXISTS "cz_user_achievements" RENAME TO "user_achievements"`,
    `ALTER TABLE IF EXISTS "cz_user_challenge_progress" RENAME TO "user_challenge_progress"`,
    `ALTER TABLE IF EXISTS "cz_user_streaks" RENAME TO "user_streaks"`,
    `ALTER TABLE IF EXISTS "cz_users" RENAME TO "users"`,
    `ALTER TABLE IF EXISTS "cz_wallet_transactions" RENAME TO "wallet_transactions"`,
    `ALTER TABLE IF EXISTS "cz_wallets" RENAME TO "wallets"`,
    `ALTER TABLE IF EXISTS "cz_withdrawal_requests" RENAME TO "withdrawal_requests"`,
  ];

  private readonly reverts: string[] = [
    `ALTER TABLE IF EXISTS "achievements" RENAME TO "cz_achievements"`,
    `ALTER TABLE IF EXISTS "app_settings" RENAME TO "cz_app_settings"`,
    `ALTER TABLE IF EXISTS "cron_job_logs" RENAME TO "cz_cron_job_logs"`,
    `ALTER TABLE IF EXISTS "daily_challenges" RENAME TO "cz_daily_challenges"`,
    `ALTER TABLE IF EXISTS "daily_checkins" RENAME TO "cz_daily_checkins"`,
    `ALTER TABLE IF EXISTS "faq_categories" RENAME TO "cz_faq_categories"`,
    `ALTER TABLE IF EXISTS "faqs" RENAME TO "cz_faqs"`,
    `ALTER TABLE IF EXISTS "gift_card_orders" RENAME TO "cz_gift_card_orders"`,
    `ALTER TABLE IF EXISTS "gift_card_products" RENAME TO "cz_gift_card_products"`,
    `ALTER TABLE IF EXISTS "kyc_verifications" RENAME TO "cz_kyc_verifications"`,
    `ALTER TABLE IF EXISTS "lucky_draw_entries" RENAME TO "cz_lucky_draw_entries"`,
    `ALTER TABLE IF EXISTS "lucky_draw_winners" RENAME TO "cz_lucky_draw_winners"`,
    `ALTER TABLE IF EXISTS "lucky_draws" RENAME TO "cz_lucky_draws"`,
    `ALTER TABLE IF EXISTS "notifications" RENAME TO "cz_notifications"`,
    `ALTER TABLE IF EXISTS "offer_clicks" RENAME TO "cz_offer_clicks"`,
    `ALTER TABLE IF EXISTS "offer_completions" RENAME TO "cz_offer_completions"`,
    `ALTER TABLE IF EXISTS "offers" RENAME TO "cz_offers"`,
    `ALTER TABLE IF EXISTS "offerwall_providers" RENAME TO "cz_offerwall_providers"`,
    `ALTER TABLE IF EXISTS "otp_codes" RENAME TO "cz_otp_codes"`,
    `ALTER TABLE IF EXISTS "quiz_attempts" RENAME TO "cz_quiz_attempts"`,
    `ALTER TABLE IF EXISTS "quizzes" RENAME TO "cz_quizzes"`,
    `ALTER TABLE IF EXISTS "referral_tier_configs" RENAME TO "cz_referral_tier_configs"`,
    `ALTER TABLE IF EXISTS "referrals" RENAME TO "cz_referrals"`,
    `ALTER TABLE IF EXISTS "scratch_cards" RENAME TO "cz_scratch_cards"`,
    `ALTER TABLE IF EXISTS "scratch_history" RENAME TO "cz_scratch_history"`,
    `ALTER TABLE IF EXISTS "spin_history" RENAME TO "cz_spin_history"`,
    `ALTER TABLE IF EXISTS "spin_wheel_configs" RENAME TO "cz_spin_wheel_configs"`,
    `ALTER TABLE IF EXISTS "streak_reward_configs" RENAME TO "cz_streak_reward_configs"`,
    `ALTER TABLE IF EXISTS "support_tickets" RENAME TO "cz_support_tickets"`,
    `ALTER TABLE IF EXISTS "user_achievements" RENAME TO "cz_user_achievements"`,
    `ALTER TABLE IF EXISTS "user_challenge_progress" RENAME TO "cz_user_challenge_progress"`,
    `ALTER TABLE IF EXISTS "user_streaks" RENAME TO "cz_user_streaks"`,
    `ALTER TABLE IF EXISTS "users" RENAME TO "cz_users"`,
    `ALTER TABLE IF EXISTS "wallet_transactions" RENAME TO "cz_wallet_transactions"`,
    `ALTER TABLE IF EXISTS "wallets" RENAME TO "cz_wallets"`,
    `ALTER TABLE IF EXISTS "withdrawal_requests" RENAME TO "cz_withdrawal_requests"`,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of this.renames) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const sql of this.reverts) {
      await queryRunner.query(sql);
    }
  }
}
