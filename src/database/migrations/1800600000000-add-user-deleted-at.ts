import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soft delete for the in-app "Delete account" action: a nullable timestamp set
 * when a user deactivates their own account (status -> 'deleted'). Additive and
 * nullable — safe on the live table. The admin hard delete still wipes the row.
 */
export class AddUserDeletedAt1800600000000 implements MigrationInterface {
  name = 'AddUserDeletedAt1800600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "deleted_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "deleted_at"`,
    );
  }
}
