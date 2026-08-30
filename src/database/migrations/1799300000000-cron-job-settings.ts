import { MigrationInterface, QueryRunner } from 'typeorm';

export class CronJobSettings1799300000000 implements MigrationInterface {
  name = 'CronJobSettings1799300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cron_job_settings" (
        "job_key" character varying(80) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "cron" character varying(120),
        "updated_by" character varying(50),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cron_job_settings" PRIMARY KEY ("job_key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cron_job_settings"`);
  }
}
