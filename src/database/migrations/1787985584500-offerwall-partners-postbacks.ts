import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferwallPartnersPostbacks1787985584500 implements MigrationInterface {
  name = 'OfferwallPartnersPostbacks1787985584500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "offerwall_partners" (
        "cz_offerwall_partner_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "slug" character varying(60) NOT NULL,
        "logo_url" character varying(500),
        "description" text,
        "click_url_template" text NOT NULL,
        "postback_method" character varying(10) NOT NULL DEFAULT 'get',
        "postback_auth_type" character varying(20) NOT NULL DEFAULT 'token',
        "postback_secret" character varying(100) NOT NULL,
        "postback_field_mapping" jsonb NOT NULL,
        "coins_per_payout_unit" integer NOT NULL DEFAULT 1,
        "rank" integer NOT NULL DEFAULT 0,
        "badge_label" character varying(40),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offerwall_partners" PRIMARY KEY ("cz_offerwall_partner_id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_offerwall_partners_slug" ON "offerwall_partners" ("slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE "offerwall_postbacks" (
        "cz_offerwall_postback_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "partner_id" uuid NOT NULL,
        "partner_name" character varying(120) NOT NULL,
        "user_id" uuid,
        "external_transaction_id" character varying(120) NOT NULL,
        "offer_name" character varying(255),
        "coins_credited" integer NOT NULL DEFAULT 0,
        "status" character varying(20) NOT NULL,
        "wallet_transaction_id" uuid,
        "raw_payload" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_offerwall_postbacks" PRIMARY KEY ("cz_offerwall_postback_id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_offerwall_postbacks_partner_tx" ON "offerwall_postbacks" ("partner_id", "external_transaction_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_offerwall_postbacks_partner_tx"`);
    await queryRunner.query(`DROP TABLE "offerwall_postbacks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_offerwall_partners_slug"`);
    await queryRunner.query(`DROP TABLE "offerwall_partners"`);
  }
}
