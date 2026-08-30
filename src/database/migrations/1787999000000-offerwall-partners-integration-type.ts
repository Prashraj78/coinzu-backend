import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferwallPartnersIntegrationType1787999000000 implements MigrationInterface {
  name = 'OfferwallPartnersIntegrationType1787999000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offerwall_partners"
      ADD COLUMN "integration_type" character varying(30) NOT NULL DEFAULT 'link',
      ADD COLUMN "partner_api_key" character varying(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offerwall_partners"
      DROP COLUMN "partner_api_key",
      DROP COLUMN "integration_type"
    `);
  }
}
