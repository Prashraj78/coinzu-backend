import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Device fraud signals: reinstall-surviving hardware_id (+ index), SIM/carrier,
 * emulator/root flags, per-device risk score/flags, and a user-level fraud
 * aggregate. All additive and nullable — safe on the live table.
 */
export class AddDeviceFraudSignals1800500000000 implements MigrationInterface {
  name = 'AddDeviceFraudSignals1800500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_devices"
        ADD COLUMN "hardware_id" varchar(255),
        ADD COLUMN "sim_country_code" varchar(2),
        ADD COLUMN "carrier" varchar(120),
        ADD COLUMN "mcc_mnc" varchar(15),
        ADD COLUMN "is_emulator" boolean,
        ADD COLUMN "is_rooted" boolean,
        ADD COLUMN "risk_score" integer,
        ADD COLUMN "risk_flags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN "first_seen_at" timestamptz
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_devices_hardware_id" ON "user_devices" ("hardware_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "fraud_score" integer NOT NULL DEFAULT 0,
        ADD COLUMN "fraud_flags" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "fraud_flags",
        DROP COLUMN "fraud_score"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_devices_hardware_id"`);
    await queryRunner.query(`
      ALTER TABLE "user_devices"
        DROP COLUMN "first_seen_at",
        DROP COLUMN "risk_flags",
        DROP COLUMN "risk_score",
        DROP COLUMN "is_rooted",
        DROP COLUMN "is_emulator",
        DROP COLUMN "mcc_mnc",
        DROP COLUMN "carrier",
        DROP COLUMN "sim_country_code",
        DROP COLUMN "hardware_id"
    `);
  }
}
