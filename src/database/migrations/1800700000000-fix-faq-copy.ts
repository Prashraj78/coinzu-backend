import { MigrationInterface, QueryRunner } from 'typeorm';

const fixes: [string, string, string][] = [
  [
    'How do I create a Coinzu account?',
    'Open the app and sign up with your email address or continue with Google. You will get a verification code by email. Enter it, finish the short setup, and your account is ready.',
    'Open the app and sign up with your email address or continue with Google. We email you a link to confirm your address. Tap it, finish the short setup, and your account is ready.',
  ],
  [
    'How do I update my profile details?',
    'Go to Profile and tap Edit. You can change your name, photo, country, age range and interests at any time. A complete profile helps us show offers that suit you.',
    'Go to Account and tap Edit profile. You can change your name, gender, age range, phone number and interests at any time. A complete profile helps us show offers that suit you.',
  ],
];

// The seeded answers promised an emailed code and profile fields the app doesn't have. Only untouched rows change.
export class FixFaqCopy1800700000000 implements MigrationInterface {
  name = 'FixFaqCopy1800700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [question, before, after] of fixes) {
      await queryRunner.query(
        `UPDATE "faqs" SET "answer" = $3 WHERE "question" = $1 AND "answer" = $2`,
        [question, before, after],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [question, before, after] of fixes) {
      await queryRunner.query(
        `UPDATE "faqs" SET "answer" = $2 WHERE "question" = $1 AND "answer" = $3`,
        [question, before, after],
      );
    }
  }
}
