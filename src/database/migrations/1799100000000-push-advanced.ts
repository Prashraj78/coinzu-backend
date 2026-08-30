import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushAdvanced1799100000000 implements MigrationInterface {
  name = 'PushAdvanced1799100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "push_campaigns"
        ADD COLUMN "emoji" character varying(16),
        ADD COLUMN "category" character varying(20) NOT NULL DEFAULT 'announcement',
        ADD COLUMN "cz_push_template_id" uuid,
        ADD COLUMN "scheduled_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "respect_quiet_hours" boolean NOT NULL DEFAULT true,
        ADD COLUMN "priority" character varying(10) NOT NULL DEFAULT 'high',
        ADD COLUMN "ttl_seconds" integer,
        ADD COLUMN "collapse_key" character varying(64),
        ADD COLUMN "android_channel_id" character varying(64),
        ADD COLUMN "sound" character varying(64),
        ADD COLUMN "badge" integer,
        ADD COLUMN "buttons" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN "delivered_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN "opened_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN "clicked_count" integer NOT NULL DEFAULT 0,
        ADD COLUMN "skipped_muted" integer NOT NULL DEFAULT 0,
        ADD COLUMN "skipped_quiet_hours" integer NOT NULL DEFAULT 0
    `);

    // The scheduler polls for due campaigns every minute; keep that lookup cheap.
    await queryRunner.query(
      `CREATE INDEX "idx_push_campaigns_scheduled" ON "push_campaigns" ("scheduled_at") WHERE "status" = 'scheduled'`,
    );

    await queryRunner.query(`
      CREATE TABLE "push_templates" (
        "cz_push_template_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "emoji" character varying(16),
        "title" character varying(120) NOT NULL,
        "body" text NOT NULL,
        "image_url" character varying(500),
        "deep_link" character varying(255),
        "category" character varying(20) NOT NULL DEFAULT 'announcement',
        "buttons" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "use_count" integer NOT NULL DEFAULT 0,
        "created_by" character varying(50),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_templates" PRIMARY KEY ("cz_push_template_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_push_templates_active" ON "push_templates" ("is_active", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "push_campaign_events" (
        "cz_push_event_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cz_push_campaign_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "event" character varying(20) NOT NULL,
        "button_id" character varying(40),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_campaign_events" PRIMARY KEY ("cz_push_event_id")
      )
    `);
    // One row per person per event, so a retrying app can never inflate a rate.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_push_events_unique" ON "push_campaign_events" ("cz_push_campaign_id", "user_id", "event")`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "notification_preferences"`,
    );
    await queryRunner.query(`DROP TABLE "push_campaign_events"`);
    await queryRunner.query(`DROP TABLE "push_templates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_push_campaigns_scheduled"`);
    await queryRunner.query(`
      ALTER TABLE "push_campaigns"
        DROP COLUMN "emoji",
        DROP COLUMN "category",
        DROP COLUMN "cz_push_template_id",
        DROP COLUMN "scheduled_at",
        DROP COLUMN "respect_quiet_hours",
        DROP COLUMN "priority",
        DROP COLUMN "ttl_seconds",
        DROP COLUMN "collapse_key",
        DROP COLUMN "android_channel_id",
        DROP COLUMN "sound",
        DROP COLUMN "badge",
        DROP COLUMN "buttons",
        DROP COLUMN "delivered_count",
        DROP COLUMN "opened_count",
        DROP COLUMN "clicked_count",
        DROP COLUMN "skipped_muted",
        DROP COLUMN "skipped_quiet_hours"
    `);
  }
}
