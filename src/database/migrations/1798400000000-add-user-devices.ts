import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDevices1798400000000 implements MigrationInterface {
  name = 'AddUserDevices1798400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "cz_device_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cz_user_id" uuid NOT NULL,
        "device_id" character varying(255) NOT NULL,
        "platform_type" character varying(10) NOT NULL,
        "fingerprint" character varying(64),
        "ip_address" character varying(45),
        "country_code" character varying(2),
        "asn" character varying(30),
        "isp" character varying(120),
        "is_vpn" boolean NOT NULL DEFAULT false,
        "user_agent" text,
        "push_token" character varying(255),
        "device_info" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_devices" PRIMARY KEY ("cz_device_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_devices_user" ON "user_devices" ("cz_user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_devices_user_device" ON "user_devices" ("cz_user_id", "device_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_devices"`);
  }
}
