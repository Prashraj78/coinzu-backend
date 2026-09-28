import { MigrationInterface, QueryRunner } from 'typeorm';

// Starter library: DiceBear's CC0 styles (Lorelei, Notionists). Admins replace or add their own art from the panel.
const starter = [
  ['Aria', 'lorelei', 'Aria'],
  ['Kai', 'lorelei', 'Kai'],
  ['Luna', 'lorelei', 'Luna'],
  ['Milo', 'lorelei', 'Milo'],
  ['Nova', 'lorelei', 'Nova'],
  ['Zara', 'lorelei', 'Zara'],
  ['Arlo', 'notionists', 'Arlo'],
  ['Iris', 'notionists', 'Iris'],
  ['Jett', 'notionists', 'Jett'],
  ['Rumi', 'notionists', 'Rumi'],
  ['Sage', 'notionists', 'Sage'],
  ['Theo', 'notionists', 'Theo'],
];

export class Avatars1800800000000 implements MigrationInterface {
  name = 'Avatars1800800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "avatars" (
        "cz_avatar_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "label" varchar(60) NOT NULL,
        "image_url" varchar(500) NOT NULL,
        "display_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_avatars" PRIMARY KEY ("cz_avatar_id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar_id" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD "google_avatar_url" varchar(500)`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_avatar" FOREIGN KEY ("avatar_id") REFERENCES "avatars"("cz_avatar_id") ON DELETE SET NULL
    `);
    // Google accounts created so far got their photo in avatar_url; keep a copy so they can switch back to it.
    await queryRunner.query(`UPDATE "users" SET "google_avatar_url" = "avatar_url" WHERE "google_id" IS NOT NULL AND "avatar_url" IS NOT NULL`);

    for (const [i, [label, style, seed]] of starter.entries()) {
      await queryRunner.query(`INSERT INTO "avatars" ("label", "image_url", "display_order") VALUES ($1, $2, $3)`, [
        label,
        `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        i + 1,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_avatar"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_avatar_url"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_id"`);
    await queryRunner.query(`DROP TABLE "avatars"`);
  }
}
