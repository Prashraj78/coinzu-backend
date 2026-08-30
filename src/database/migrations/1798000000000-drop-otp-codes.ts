import { MigrationInterface, QueryRunner } from 'typeorm';

/** OTP codes now live in Redis only (see OtpService), not Postgres. */
export class DropOtpCodes1798000000000 implements MigrationInterface {
  name = 'DropOtpCodes1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_codes"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "otp_codes" ("cz_otp_code_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "channel" character varying(10) NOT NULL, "purpose" character varying(20) NOT NULL, "destination" character varying(255) NOT NULL, "code_hash" character varying(255) NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cd479a236c09ccaffd2b6d09505" PRIMARY KEY ("cz_otp_code_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e674f940daf10238eb83b92d05" ON "otp_codes" ("destination", "purpose") `,
    );
  }
}
