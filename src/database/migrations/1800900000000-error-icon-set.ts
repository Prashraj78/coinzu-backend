import { MigrationInterface, QueryRunner } from 'typeorm';
import { Env } from '../../common/config/env';
import { CzErrorIcon } from '../../common/errors/error.constants';

// Versioned folder so a redesign never fights a cached copy.
const folder = 'dropdown-icons/error_icon/v1';

export class ErrorIconSet1800900000000 implements MigrationInterface {
  name = 'ErrorIconSet1800900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const base = Env.r2.publicUrl.replace(/\/$/, '');
    if (!base) return;
    for (const value of Object.values(CzErrorIcon)) {
      await queryRunner.query(`UPDATE "dropdown_options" SET "icon_url" = $1 WHERE "type" = 'error_icon' AND "value" = $2`, [
        `${base}/${folder}/${value}.webp`,
        value,
      ]);
    }
  }

  // Data-only change: the icons stay in place on rollback.
  public async down(): Promise<void> {}
}
