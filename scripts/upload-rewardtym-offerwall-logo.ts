/**
 * One-off: uploads the RewardTym brand mark (the same file used on the
 * admin dashboard's login screens) to R2 and sets it as the logo_url on
 * the 'rewardtym' offerwall_partners row created by
 * onboard-rewardtym-offerwall.ts.
 *
 * Run from project root:
 *   npx ts-node -r tsconfig-paths/register scripts/upload-rewardtym-offerwall-logo.ts
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DataSource } from 'typeorm';

const LOGO_PATH = join(__dirname, '../../rewardtym-frontend/public/logo-reward.png');

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const buffer = readFileSync(LOGO_PATH);
  const key = `offerwall-logos/${randomUUID()}.png`;

  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }),
  );

  const logo_url = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`;
  console.log('Uploaded to:', logo_url);

  await dataSource.initialize();
  try {
    const [rows] = await dataSource.query(
      `UPDATE offerwall_partners SET logo_url = $1 WHERE slug = 'rewardtym' RETURNING cz_offerwall_partner_id`,
      [logo_url],
    );
    if (!rows) {
      console.error('No offerwall_partners row with slug "rewardtym" found. Run onboard-rewardtym-offerwall.ts first.');
      process.exit(1);
    }
    console.log('Updated offerwall_partners.logo_url for cz_offerwall_partner_id:', rows.cz_offerwall_partner_id);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
