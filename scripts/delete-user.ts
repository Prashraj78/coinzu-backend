/**
 * Dev utility: hard-deletes a user and every row that references them.
 *
 * The database has no ON DELETE cascades on cz_user_id, so each child table is
 * cleared explicitly before the users row itself. Order matters only in that
 * the users row goes last; child tables are independent of each other.
 *
 * Run from project root:
 *   USER_EMAIL=someone@example.com npx ts-node -r tsconfig-paths/register scripts/delete-user.ts
 *
 * Or via the package script (defaults to the maintainer's test account):
 *   npm run delete:prashant
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

// Every table that references a user, with the column that holds the reference.
// created_by tables are admin-authored content; null them out rather than delete.
const userIdTables = [
  'daily_checkins',
  'daily_chest_claims',
  'gift_card_orders',
  'kyc_verifications',
  'lucky_draw_entries',
  'lucky_draw_winners',
  'notifications',
  'offer_clicks',
  'offerwall_postbacks',
  'push_campaign_events',
  'quiz_attempts',
  'reward_plays',
  'scratch_card_grants',
  'scratch_history',
  'spin_history',
  'support_tickets',
  'user_achievements',
  'user_challenge_progress',
  'wallet_transactions',
  'withdrawal_requests',
];
const czUserIdTables = ['user_devices', 'user_streaks', 'wallets'];
const createdByTables = ['push_campaigns', 'push_templates'];

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const email = (process.env.USER_EMAIL ?? '').trim().toLowerCase();
  if (!email) {
    console.error('Set USER_EMAIL to the account to delete.');
    process.exit(1);
  }

  await dataSource.initialize();
  try {
    const found = await dataSource.query(
      'SELECT cz_user_id, email FROM users WHERE lower(email) = $1',
      [email],
    );
    if (found.length === 0) {
      console.log(`No user with email ${email}. Nothing to delete.`);
      return;
    }
    const userId = found[0].cz_user_id;

    await dataSource.transaction(async (tx) => {
      for (const table of userIdTables) {
        const res = await tx.query(`DELETE FROM "${table}" WHERE user_id = $1`, [userId]);
        if (res.length || res.rowCount) console.log(`  cleared ${table}`);
      }
      for (const table of czUserIdTables) {
        await tx.query(`DELETE FROM "${table}" WHERE cz_user_id = $1`, [userId]);
        console.log(`  cleared ${table}`);
      }
      for (const table of createdByTables) {
        await tx.query(`UPDATE "${table}" SET created_by = NULL WHERE created_by = $1`, [userId]);
      }
      // Detach anyone this user referred so the users row can go.
      await tx.query('UPDATE users SET referred_by = NULL WHERE referred_by = $1', [userId]);
      await tx.query('DELETE FROM users WHERE cz_user_id = $1', [userId]);
    });

    console.log(`Deleted ${email} (${userId}) and all related rows.`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
