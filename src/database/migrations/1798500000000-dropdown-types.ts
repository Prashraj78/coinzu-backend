import { MigrationInterface, QueryRunner } from 'typeorm';

/** Backfills one type row per distinct type already present in dropdown_options. */
export class DropdownTypes1798500000000 implements MigrationInterface {
  name = 'DropdownTypes1798500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dropdown_types" (
        "cz_dropdown_type_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(40) NOT NULL,
        "label" character varying(120) NOT NULL,
        "description" character varying(300),
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dropdown_types" PRIMARY KEY ("cz_dropdown_type_id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_dropdown_types_type" ON "dropdown_types" ("type")`,
    );
    await queryRunner.query(`
      INSERT INTO "dropdown_types" ("type", "label", "display_order", "is_active")
      SELECT DISTINCT "type", initcap(replace("type", '_', ' ')), 0, true
      FROM "dropdown_options"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dropdown_types"`);
  }
}
