import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * What the partner network paid for the conversion behind a ledger row, so the
 * admin dashboard can show real revenue next to the coins handed out for it.
 * Nullable: only RewardTym conversion rows carry it, and only from now on.
 */
export class LedgerRevenue1801100000000 implements MigrationInterface {
  name = 'LedgerRevenue1801100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "revenue_usd" numeric(12,4)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_created_at" ON "wallet_transactions" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_wallet_transactions_created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN IF EXISTS "revenue_usd"`,
    );
  }
}
