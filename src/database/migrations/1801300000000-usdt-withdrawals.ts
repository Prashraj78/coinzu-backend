import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Manual USDT payouts: network + plain wallet address, the fee split, and the admin's tx hash.
 * The partial unique index makes "one pending withdrawal per user" race-safe.
 */
export class UsdtWithdrawals1801300000000 implements MigrationInterface {
  name = 'UsdtWithdrawals1801300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "withdrawal_requests"
        ADD COLUMN IF NOT EXISTS "network" varchar(10),
        ADD COLUMN IF NOT EXISTS "wallet_address" varchar(64),
        ADD COLUMN IF NOT EXISTS "fee_percent" numeric(5,2),
        ADD COLUMN IF NOT EXISTS "fee_usd" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "payout_usd" numeric(12,2),
        ADD COLUMN IF NOT EXISTS "tx_hash" varchar(100),
        ADD COLUMN IF NOT EXISTS "admin_note" text,
        ADD COLUMN IF NOT EXISTS "paid_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "withdrawal_requests" ALTER COLUMN "destination_details_encrypted" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_withdrawal_requests_one_pending" ON "withdrawal_requests" ("user_id") WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_withdrawal_requests_status_created_at" ON "withdrawal_requests" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_withdrawal_requests_status_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_withdrawal_requests_one_pending"`,
    );
    await queryRunner.query(
      `ALTER TABLE "withdrawal_requests"
        DROP COLUMN IF EXISTS "paid_at",
        DROP COLUMN IF EXISTS "admin_note",
        DROP COLUMN IF EXISTS "tx_hash",
        DROP COLUMN IF EXISTS "payout_usd",
        DROP COLUMN IF EXISTS "fee_usd",
        DROP COLUMN IF EXISTS "fee_percent",
        DROP COLUMN IF EXISTS "wallet_address",
        DROP COLUMN IF EXISTS "network"`,
    );
  }
}
