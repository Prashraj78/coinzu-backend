import { MigrationInterface, QueryRunner } from 'typeorm';
import { Env } from '../../common/config/env';
import { CzErrorIcon } from '../../common/errors/error.constants';

// The designed error icon set on R2: one glossy tile per error family plus a status badge
// (failed, needs action, waiting, done, locked, duplicate). Versioned folder so a redesign never fights a cached copy.
const folder = 'dropdown-icons/error_icon/v1';

// Points every error_icon row at its new image. The old URLs are kept in a backup table so down() can put them back.
export class ErrorIconSet1800900000000 implements MigrationInterface {
  name = 'ErrorIconSet1800900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const base = Env.r2.publicUrl.replace(/\/$/, '');
    if (!base) return;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "error_icon_url_backup" (
        "value" varchar(120) PRIMARY KEY,
        "icon_url" varchar(500)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "error_icon_url_backup" ("value", "icon_url")
      SELECT "value", "icon_url" FROM "dropdown_options" WHERE "type" = 'error_icon'
      ON CONFLICT ("value") DO NOTHING
    `);
    for (const value of Object.values(CzErrorIcon)) {
      await queryRunner.query(`UPDATE "dropdown_options" SET "icon_url" = $1 WHERE "type" = 'error_icon' AND "value" = $2`, [
        `${base}/${folder}/${value}.webp`,
        value,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasBackup = await queryRunner.hasTable('error_icon_url_backup');
    if (!hasBackup) return;
    await queryRunner.query(`
      UPDATE "dropdown_options" d SET "icon_url" = b."icon_url"
      FROM "error_icon_url_backup" b
      WHERE d."type" = 'error_icon' AND d."value" = b."value"
    `);
    await queryRunner.query(`DROP TABLE "error_icon_url_backup"`);
  }
}
