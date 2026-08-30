import { MigrationInterface, QueryRunner } from 'typeorm';

export class WalletTransactionsNote1798200000000 implements MigrationInterface {
  name = 'WalletTransactionsNote1798200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD COLUMN "note" character varying(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP COLUMN "note"`);
  }
}
