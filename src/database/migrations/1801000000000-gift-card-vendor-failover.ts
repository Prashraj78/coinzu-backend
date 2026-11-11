import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Primary/secondary gift-card vendors. An order now records the vendor that
 * actually holds it (failover can move it off the product's vendor), and a
 * product carries a cross-vendor key so the same brand + amount can be found
 * at the other vendor.
 */
export class GiftCardVendorFailover1801000000000 implements MigrationInterface {
  name = 'GiftCardVendorFailover1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gift_card_orders" ADD COLUMN IF NOT EXISTS "provider_name" varchar(60)`,
    );
    await queryRunner.query(
      `UPDATE "gift_card_orders" o SET "provider_name" = p."provider_name"
         FROM "gift_card_products" p
        WHERE p."cz_gift_card_product_id" = o."product_id" AND o."provider_name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" ADD COLUMN IF NOT EXISTS "match_key" varchar(160)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gift_card_products_match_key" ON "gift_card_products" ("match_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_gift_card_products_match_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_products" DROP COLUMN IF EXISTS "match_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gift_card_orders" DROP COLUMN IF EXISTS "provider_name"`,
    );
  }
}
