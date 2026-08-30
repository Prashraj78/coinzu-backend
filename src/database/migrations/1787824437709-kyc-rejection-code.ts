import { MigrationInterface, QueryRunner } from 'typeorm';

/** Columns that hold the id of the admin who acted, one table each. */
const ADMIN_ID_COLUMNS: Array<[table: string, column: string]> = [
  ['kyc_verifications', 'reviewed_by'],
  ['support_tickets', 'resolved_by'],
  ['withdrawal_requests', 'reviewed_by'],
];

/**
 * Two fixes for admin review.
 *
 * `rejection_code` is the machine-readable half of a rejection —
 * `rejection_reason` stays the sentence an admin types, `rejection_code` is
 * what the app switches on to pick its own wording.
 *
 * The `*_by` columns were `uuid`, but the admin acting on a Coinzu row is a
 * Rewardtym admin whose id looks like `lt_admin_9f2c...`. Writing that into a
 * uuid column fails outright, so every admin approve/reject/resolve broke on
 * the insert. They become varchar(50), which is what Rewardtym uses.
 */
export class KycRejectionCode1787824437709 implements MigrationInterface {
  name = 'KycRejectionCode1787824437709';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "kyc_verifications" ADD COLUMN IF NOT EXISTS "rejection_code" character varying(20)`,
    );

    for (const [table, column] of ADMIN_ID_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE character varying(50) USING "${column}"::text`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of ADMIN_ID_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE uuid USING "${column}"::uuid`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "kyc_verifications" DROP COLUMN IF EXISTS "rejection_code"`,
    );
  }
}
