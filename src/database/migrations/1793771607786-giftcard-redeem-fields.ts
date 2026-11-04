import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gift-card products gain a vendor brand reference and the brand's redeem
 * instructions, filled at catalogue sync so orders can email the steps.
 * (Hand-trimmed to the real change; the generator also diffed pre-existing
 * schema drift, which is intentionally left out.)
 */
export class GiftcardRedeemFields1793771607786 implements MigrationInterface {
  name = 'GiftcardRedeemFields1793771607786';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" ADD "brand_ref" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" ADD "redeem_concise" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" ADD "redeem_verbose" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" DROP COLUMN "redeem_verbose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" DROP COLUMN "redeem_concise"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" DROP COLUMN "brand_ref"`,
    );
  }
}
