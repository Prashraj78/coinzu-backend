import { MigrationInterface, QueryRunner } from 'typeorm';

/** The admin tab shows who ran a job by hand and when it finished. */
export class CronLogTrigger1799400000000 implements MigrationInterface {
  name = 'CronLogTrigger1799400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cron_job_logs"
        ADD COLUMN "finished_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "triggered_by" character varying(80)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cron_job_logs"
        DROP COLUMN "finished_at",
        DROP COLUMN "triggered_by"
    `);
  }
}
