// Dev utility: credits test coins to one account through the ledger (admin_adjustment).
// USER_EMAIL=someone@example.com COINS=20000 npx ts-node -r tsconfig-paths/register scripts/credit-test-coins.ts
import 'dotenv/config';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const email = process.env.USER_EMAIL;
  const coins = Number(process.env.COINS ?? 20000);
  if (!email || !Number.isInteger(coins) || coins <= 0) {
    throw new Error('Set USER_EMAIL and a positive whole COINS.');
  }
  await dataSource.initialize();
  await dataSource.transaction(async (tx) => {
    const [user] = await tx.query(
      `SELECT cz_user_id FROM users WHERE email = $1`,
      [email],
    );
    if (!user) throw new Error(`No user with email ${email}.`);
    await tx.query(
      `INSERT INTO wallets (cz_user_id, coin_balance, gem_balance) VALUES ($1, 0, 0) ON CONFLICT (cz_user_id) DO NOTHING`,
      [user.cz_user_id],
    );
    // An UPDATE ... RETURNING comes back from TypeORM's raw query as [rows, affectedCount].
    const [[wallet]] = (await tx.query(
      `UPDATE wallets SET coin_balance = coin_balance + $2 WHERE cz_user_id = $1 RETURNING coin_balance`,
      [user.cz_user_id, coins],
    )) as [{ coin_balance: number }[], number];
    await tx.query(
      `INSERT INTO wallet_transactions (user_id, currency, type, amount, balance_after, source_type, note)
       VALUES ($1, 'coin', 'earn', $2, $3, 'admin_adjustment', 'Test coins for withdrawal testing')`,
      [user.cz_user_id, coins, wallet.coin_balance],
    );
    console.log(`Credited ${coins} coins to ${email}; balance ${wallet.coin_balance}.`);
  });
  await dataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
