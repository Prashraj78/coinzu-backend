import { MigrationInterface, QueryRunner } from 'typeorm';

/** 'link' is renamed to 'iframe' — every non-rewardtym partner opens inside the app iframe, never an external redirect. */
export class OfferwallPartnersIframeRevshare1798100000000 implements MigrationInterface {
  name = 'OfferwallPartnersIframeRevshare1798100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offerwall_partners"
      ADD COLUMN "revenue_share_percent" integer
    `);
    await queryRunner.query(
      `UPDATE "offerwall_partners" SET "integration_type" = 'iframe' WHERE "integration_type" = 'link'`,
    );
    await queryRunner.query(
      `ALTER TABLE "offerwall_partners" ALTER COLUMN "integration_type" SET DEFAULT 'iframe'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "offerwall_partners" ALTER COLUMN "integration_type" SET DEFAULT 'link'`,
    );
    await queryRunner.query(
      `UPDATE "offerwall_partners" SET "integration_type" = 'link' WHERE "integration_type" = 'iframe'`,
    );
    await queryRunner.query(`ALTER TABLE "offerwall_partners" DROP COLUMN "revenue_share_percent"`);
  }
}
