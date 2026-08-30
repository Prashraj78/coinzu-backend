import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Coinzu has no admin accounts of its own. Rewardtym admins call the Coinzu
 * admin APIs with their Rewardtym token, so the table is gone for good.
 */
export class DropAdminUsers1787824437707 implements MigrationInterface {
  name = 'DropAdminUsers1787824437707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cz_admin_users"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cz_admin_users" ("cz_admin_user_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "name" character varying(120), "role" character varying(20) NOT NULL DEFAULT 'support_agent', "is_active" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ae15beb2836bd056ece782eae43" PRIMARY KEY ("cz_admin_user_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_13044b22211bf526d3befeb5ee" ON "cz_admin_users" ("email")`,
    );
  }
}
