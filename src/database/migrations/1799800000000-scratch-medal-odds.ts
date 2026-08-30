import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A scratch prize can be gated behind a medal tier, so a user's best medal
 * changes which prizes are in their pool. Null means everyone can win it.
 */
export class ScratchMedalOdds1799800000000 implements MigrationInterface {
  name = 'ScratchMedalOdds1799800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scratch_cards" ADD COLUMN "min_medal_rarity" character varying(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scratch_cards" DROP COLUMN "min_medal_rarity"`,
    );
  }
}
