import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Report a Problem screen asks for more than the original ticket form did.
 * `messages` is the thread the two-way reply feature will append to; today it
 * holds the single message the user submitted.
 */
export class SupportTicketReportFields1798900000000
  implements MigrationInterface
{
  name = 'SupportTicketReportFields1798900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
        ADD COLUMN IF NOT EXISTS "issue_type" character varying(60),
        ADD COLUMN IF NOT EXISTS "occurred_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "affected_area" character varying(120),
        ADD COLUMN IF NOT EXISTS "messages" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // Seed the thread with what each existing ticket already said.
    await queryRunner.query(`
      UPDATE "support_tickets"
      SET "messages" = jsonb_build_array(
        jsonb_build_object(
          'from', 'user',
          'body', "description",
          'author_id', "user_id"::text,
          'created_at', to_char("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
      )
      WHERE "messages" = '[]'::jsonb
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_support_tickets_type_status" ON "support_tickets" ("type", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_support_tickets_created" ON "support_tickets" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_support_tickets_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_support_tickets_type_status"`);
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
        DROP COLUMN IF EXISTS "issue_type",
        DROP COLUMN IF EXISTS "occurred_at",
        DROP COLUMN IF EXISTS "affected_area",
        DROP COLUMN IF EXISTS "messages"
    `);
  }
}
