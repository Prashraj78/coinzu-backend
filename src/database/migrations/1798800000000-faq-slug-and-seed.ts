import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives FAQ categories a stable slug the app can send as a query param, then
 * seeds the categories and questions from the FAQs screen.
 */
export class FaqSlugAndSeed1798800000000 implements MigrationInterface {
  name = 'FaqSlugAndSeed1798800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "faq_categories" ADD COLUMN IF NOT EXISTS "slug" character varying(40)`,
    );
    // Back-fill any category that already existed before slugs.
    await queryRunner.query(`
      UPDATE "faq_categories"
      SET "slug" = regexp_replace(lower("name"), '[^a-z0-9]+', '_', 'g')
      WHERE "slug" IS NULL
    `);

    const categories: Array<[slug: string, name: string, icon: string, order: number]> = [
      ['account', 'Account', 'UserRound', 1],
      ['rewards', 'Rewards', 'Gift', 2],
      ['payment', 'Payment', 'CreditCard', 3],
      ['security', 'Security', 'ShieldCheck', 4],
      ['referrals', 'Referrals', 'Users', 5],
    ];

    const ids = new Map<string, string>();
    for (const [slug, name, icon, order] of categories) {
      const existing: Array<{ cz_faq_category_id: string }> =
        await queryRunner.query(
          `SELECT "cz_faq_category_id" FROM "faq_categories" WHERE "slug" = $1`,
          [slug],
        );
      if (existing.length) {
        ids.set(slug, existing[0].cz_faq_category_id);
        continue;
      }
      const inserted: Array<{ cz_faq_category_id: string }> =
        await queryRunner.query(
          `INSERT INTO "faq_categories" ("slug", "name", "icon", "display_order", "is_active")
           VALUES ($1, $2, $3, $4, true)
           RETURNING "cz_faq_category_id"`,
          [slug, name, icon, order],
        );
      ids.set(slug, inserted[0].cz_faq_category_id);
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_faq_categories_slug" ON "faq_categories" ("slug")`,
    );

    const faqs: Array<[slug: string, question: string, answer: string]> = [
      [
        'account',
        'How do I create a Coinzu account?',
        'Open the app and sign up with your email address or continue with Google. You will get a verification code by email. Enter it, finish the short setup, and your account is ready.',
      ],
      [
        'account',
        'Why do I need to verify my email?',
        'Verifying your email keeps your account recoverable and protects your balance. Some rewards and withdrawals stay locked until your email is confirmed.',
      ],
      [
        'account',
        'How do I update my profile details?',
        'Go to Profile and tap Edit. You can change your name, photo, country, age range and interests at any time. A complete profile helps us show offers that suit you.',
      ],
      [
        'account',
        'I forgot my password. What do I do?',
        'Tap Forgot password on the sign in screen and enter your email. We will send you a reset link. The link works once and expires after a short time, so use it soon after you get it.',
      ],
      [
        'account',
        'Can I use the same account on more than one device?',
        'Yes. Sign in with the same email on any device and your balance and history follow you. We do keep a record of the devices you sign in from to protect the account.',
      ],
      [
        'account',
        'How do I delete my account?',
        'Write to support from the Help section and ask us to close the account. Withdraw any balance first, because coins and gems cannot be recovered once the account is closed.',
      ],

      [
        'rewards',
        'How do I earn rewards on Coinzu?',
        'You earn by completing offers, playing games, checking in daily, keeping a streak, joining contests and inviting friends. The more you do, the more you earn.',
      ],
      [
        'rewards',
        'Why was my offer marked as pending?',
        'A partner has to confirm your action before the coins are released. Most offers confirm within a few minutes, but some take up to a few days depending on the partner.',
      ],
      [
        'rewards',
        'My offer is complete but I did not get the coins. What now?',
        'Wait a little while first, because partners often report late. If it has been more than 48 hours, contact support with the offer name and the date and we will follow it up.',
      ],
      [
        'rewards',
        'What is the difference between coins and gems?',
        'Coins are the main currency and can be withdrawn or spent on gift cards. Gems are the bonus currency you pick up from games and contests, and they can be converted into coins.',
      ],
      [
        'rewards',
        'How does the daily check in work?',
        'Open the app once a day and tap check in. Checking in on back to back days builds a streak, and a longer streak pays a bigger bonus. Miss a day and the streak starts again.',
      ],
      [
        'rewards',
        'Can my rewards be taken back?',
        'Yes, but only if a partner reverses a conversion, for example when an order is cancelled or found to be fraudulent. You will see a matching entry in your wallet history when that happens.',
      ],

      [
        'payment',
        'How can I withdraw my earnings?',
        'Go to Wallet and tap Withdraw. Pick a payout method, enter the amount and confirm. The coins leave your balance straight away and our team reviews the request.',
      ],
      [
        'payment',
        'Which payment methods are supported?',
        'You can cash out to PayPal, to a bank account, or in crypto. You can also swap coins for gift cards from the Redeem section without a payout at all.',
      ],
      [
        'payment',
        'Is there a minimum withdrawal amount?',
        'Yes. The minimum is shown on the withdraw screen and can change over time, so always check the current figure there before you request a payout.',
      ],
      [
        'payment',
        'How long does a withdrawal take?',
        'Most payouts are reviewed within one to three working days. Once approved, the money reaches you at the speed of the method you picked.',
      ],
      [
        'payment',
        'Why was my withdrawal rejected?',
        'The usual reasons are incomplete identity verification, payout details that do not match your name, or activity that broke our terms. The rejection note in your history explains which one applies.',
      ],
      [
        'payment',
        'How many coins is one dollar worth?',
        'The rate is shown live on the Wallet screen right under your balance. We can adjust it from time to time, so always read the figure in the app rather than saving an old one.',
      ],

      [
        'security',
        'Is my data and my account secure?',
        'Yes. Your session is protected with an encrypted token, payout details are stored encrypted, and we never show your full payment information anywhere in the app.',
      ],
      [
        'security',
        'Why do I have to complete identity verification?',
        'Identity checks keep one person from running many accounts and protect real earnings from fraud. You only need to pass the check once, before your first payout.',
      ],
      [
        'security',
        'What happens during identity verification?',
        'You take a selfie in the app and we match it against your submitted document. Most checks finish in seconds. If the result is unclear, a person reviews it and you will hear back.',
      ],
      [
        'security',
        'Can I use a VPN with Coinzu?',
        'We do not recommend it. Many partners block traffic from VPNs, so your offers may fail to confirm, and repeated VPN use can get an account flagged for review.',
      ],
      [
        'security',
        'What should I do if I think someone accessed my account?',
        'Change your password right away from the profile screen, then contact support. We can review the devices that signed in and lock the account while we look into it.',
      ],
      [
        'security',
        'Will Coinzu ever ask for my password?',
        'Never. Our team will not ask for your password, your one time codes or your full payment details. Treat any message that does as a scam and report it to us.',
      ],

      [
        'referrals',
        'How does the referral program work?',
        'Share your invite link with a friend. When they sign up with it and reach the steps in the reward list, you earn coins or gems for each step they clear.',
      ],
      [
        'referrals',
        'Where do I find my invite link?',
        'Open the Invite a Friend screen. Your personal code and link are at the top and you can copy or share either of them in one tap.',
      ],
      [
        'referrals',
        'When do I get paid for an invite?',
        'Each step pays as soon as your friend clears it. The Invite a Friend screen lists every step and what it pays, so you always know what is coming next.',
      ],
      [
        'referrals',
        'Is there a limit on how much one friend can earn me?',
        'Yes. There is a cap on the total coins and gems a single friend can earn you. The Invite a Friend screen shows the current maximum per friend.',
      ],
      [
        'referrals',
        'My friend signed up but I did not get anything. Why?',
        'Check that they used your link or entered your code while signing up. A code cannot be added afterwards. If they did use it, they may not have reached a paying step yet.',
      ],
      [
        'referrals',
        'Can I invite as many people as I want?',
        'Yes, there is no limit on the number of friends you invite. Every genuine signup counts. Accounts created by the same person are removed and are not paid.',
      ],
    ];

    for (const [slug, question, answer] of faqs) {
      const category_id = ids.get(slug);
      if (!category_id) continue;
      const dup: Array<{ cz_faq_id: string }> = await queryRunner.query(
        `SELECT "cz_faq_id" FROM "faqs" WHERE "category_id" = $1 AND "question" = $2`,
        [category_id, question],
      );
      if (dup.length) continue;
      const order: Array<{ next: string }> = await queryRunner.query(
        `SELECT COALESCE(MAX("display_order"), 0) + 1 AS next FROM "faqs" WHERE "category_id" = $1`,
        [category_id],
      );
      await queryRunner.query(
        `INSERT INTO "faqs" ("category_id", "question", "answer", "display_order", "is_active")
         VALUES ($1, $2, $3, $4, true)`,
        [category_id, question, answer, Number(order[0].next)],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "faqs" WHERE "category_id" IN (
         SELECT "cz_faq_category_id" FROM "faq_categories"
         WHERE "slug" IN ('account','rewards','payment','security','referrals')
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "faq_categories" WHERE "slug" IN ('account','rewards','payment','security','referrals')`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_faq_categories_slug"`);
    await queryRunner.query(`ALTER TABLE "faq_categories" DROP COLUMN IF EXISTS "slug"`);
  }
}
