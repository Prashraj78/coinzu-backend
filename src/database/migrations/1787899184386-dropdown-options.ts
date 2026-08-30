import { MigrationInterface, QueryRunner } from 'typeorm';

/** Seed rows: interest icons live in R2 under dropdown-icons/interest/. */
const R2_PUBLIC_URL = 'https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev';

const INTERESTS: Array<[value: string, label: string, icon: string]> = [
  ['action', 'Action', 'action'],
  ['puzzle', 'Puzzle', 'puzzle'],
  ['card', 'Card', 'card'],
  ['multiplayer', 'Multiplayer', 'multiplayer'],
  ['sports', 'Sports', 'sports'],
  ['finance', 'Finance', 'finance'],
  ['casual', 'Casual', 'casual'],
  ['entertainment', 'Entertainment', 'entertainment'],
  ['survey', 'Survey', 'survey'],
];

const GENDERS: Array<[value: string, label: string]> = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
];

export class DropdownOptions1787899184386 implements MigrationInterface {
  name = 'DropdownOptions1787899184386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dropdown_options" (
        "cz_dropdown_option_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying(40) NOT NULL,
        "value" character varying(60) NOT NULL,
        "label" character varying(120) NOT NULL,
        "icon_url" character varying(500),
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_dropdown_options" PRIMARY KEY ("cz_dropdown_option_id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dropdown_options_type_value" ON "dropdown_options" ("type", "value")`,
    );

    const values: string[] = [];
    const params: unknown[] = [];
    let order = 0;
    for (const [value, label, icon] of INTERESTS) {
      const iconUrl = `${R2_PUBLIC_URL}/dropdown-icons/interest/${icon}.png`;
      params.push('interest', value, label, iconUrl, order++);
      values.push(
        `($${params.length - 4}, $${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length})`,
      );
    }
    order = 0;
    for (const [value, label] of GENDERS) {
      params.push('gender', value, label, order++);
      values.push(
        `($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, NULL, $${params.length})`,
      );
    }

    await queryRunner.query(
      `INSERT INTO "dropdown_options" ("type", "value", "label", "icon_url", "display_order") VALUES ${values.join(', ')}`,
      params,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dropdown_options"`);
  }
}
