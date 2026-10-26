import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tracks whether a verified selfie was enrolled in the Rekognition collection.
 *
 * The duplicate-face guard only catches a new selfie when the matching face is
 * already in the collection. Enrolment used to be fire-and-forget: a failed
 * `IndexFaces` was swallowed, so that user silently dropped out of every future
 * duplicate check. This column makes an un-enrolled verification visible, so the
 * backfill script can find and re-index it.
 *
 * Existing verified rows default to `false`; the backfill reconciles them
 * against the live collection and flips the ones that are actually indexed.
 */
export class KycFaceIndexed1800900000000 implements MigrationInterface {
  name = 'KycFaceIndexed1800900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "kyc_verifications" ADD COLUMN IF NOT EXISTS "face_indexed" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "kyc_verifications" DROP COLUMN IF EXISTS "face_indexed"`,
    );
  }
}
