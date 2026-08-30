import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Entries are bought in packs now, so one user has many rows per draw. The old
 * unique index enforced the retired "one entry per user" rule.
 */
export class EntriesStack1800400000000 implements MigrationInterface {
  name = 'EntriesStack1800400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_287fce32213b9aad516b1440cf"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_287fce32213b9aad516b1440cf"
       ON "lucky_draw_entries" ("draw_id", "user_id")`,
    );
  }
}
