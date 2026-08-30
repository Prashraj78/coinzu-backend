import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `rewardtym_auth_code` is retired — every offerwall partner is a plain
 * iframe now, so the column that picked between the two modes (and the
 * API key that only the auth-code mode used) no longer means anything.
 */
export class OfferwallPartnersDropIntegrationType1798300000000 implements MigrationInterface {
  name = 'OfferwallPartnersDropIntegrationType1798300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offerwall_partners"
      DROP COLUMN "integration_type",
      DROP COLUMN "partner_api_key"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offerwall_partners"
      ADD COLUMN "integration_type" character varying(30) NOT NULL DEFAULT 'iframe',
      ADD COLUMN "partner_api_key" character varying(200)
    `);
  }
}
