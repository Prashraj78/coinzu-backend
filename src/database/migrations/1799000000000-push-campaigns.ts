import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushCampaigns1799000000000 implements MigrationInterface {
  name = 'PushCampaigns1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_campaigns" (
        "cz_push_campaign_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(120) NOT NULL,
        "body" text NOT NULL,
        "image_url" character varying(500),
        "deep_link" character varying(255),
        "audience_type" character varying(20) NOT NULL DEFAULT 'all',
        "audience" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "targeted_users" integer NOT NULL DEFAULT 0,
        "targeted_devices" integer NOT NULL DEFAULT 0,
        "sent_count" integer NOT NULL DEFAULT 0,
        "failed_count" integer NOT NULL DEFAULT 0,
        "pruned_tokens" integer NOT NULL DEFAULT 0,
        "dry_run" boolean NOT NULL DEFAULT false,
        "error" text,
        "created_by" character varying(50),
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_campaigns" PRIMARY KEY ("cz_push_campaign_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_push_campaigns_status_created" ON "push_campaigns" ("status", "created_at")`,
    );
    // Sends fan out over device tokens; this makes the lookup cheap.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_devices_push_token" ON "user_devices" ("push_token") WHERE "push_token" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_devices_push_token"`);
    await queryRunner.query(`DROP TABLE "push_campaigns"`);
  }
}
