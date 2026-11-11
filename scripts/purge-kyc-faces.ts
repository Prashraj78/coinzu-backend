/**
 * Lists or deletes faces in the Rekognition KYC collection.
 *
 * Report only (default): prints every enrolled face with its owner's email.
 *   npx ts-node -r tsconfig-paths/register scripts/purge-kyc-faces.ts
 *
 * Delete faces for one account (by email), and reset its face_indexed flag:
 *   APPLY=true EMAIL=user@example.com npx ts-node -r tsconfig-paths/register scripts/purge-kyc-faces.ts
 *
 * Delete EVERY face in the collection, and reset all face_indexed flags:
 *   APPLY=true ALL=true npx ts-node -r tsconfig-paths/register scripts/purge-kyc-faces.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  DeleteFacesCommand,
  ListFacesCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';

const FACE_COLLECTION_ID = 'coinzu-kyc-faces';
const APPLY = process.env.APPLY === 'true';
const ALL = process.env.ALL === 'true';
const EMAIL = process.env.EMAIL?.trim().toLowerCase();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const rek = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

async function listFaces(): Promise<Array<{ faceId: string; userId: string }>> {
  const faces: Array<{ faceId: string; userId: string }> = [];
  let next: string | undefined;
  do {
    const res = await rek.send(
      new ListFacesCommand({ CollectionId: FACE_COLLECTION_ID, MaxResults: 1000, NextToken: next }),
    );
    for (const f of res.Faces ?? []) {
      if (f.FaceId) faces.push({ faceId: f.FaceId, userId: f.ExternalImageId ?? '' });
    }
    next = res.NextToken;
  } while (next);
  return faces;
}

async function run() {
  await dataSource.initialize();
  try {
    const faces = await listFaces();
    const userIds = [...new Set(faces.map((f) => f.userId).filter(Boolean))];
    const users: Array<{ cz_user_id: string; email: string }> = userIds.length
      ? await dataSource.query(
          `SELECT cz_user_id, email FROM users WHERE cz_user_id::text = ANY($1)`,
          [userIds],
        )
      : [];
    const emailOf = new Map(users.map((u) => [u.cz_user_id, u.email]));

    console.log(`Collection ${FACE_COLLECTION_ID}: ${faces.length} face(s)`);
    for (const f of faces) {
      console.log(`  ${f.faceId}  user=${f.userId || '-'}  email=${emailOf.get(f.userId) ?? '(no user row)'}`);
    }

    let targets = faces;
    if (!ALL) {
      if (!EMAIL) {
        console.log('\nNo EMAIL or ALL=true given. Report only.');
        return;
      }
      targets = faces.filter((f) => emailOf.get(f.userId)?.toLowerCase() === EMAIL);
    }
    console.log(`\nTarget: ${ALL ? 'ALL faces' : EMAIL}  -> ${targets.length} face(s)`);
    if (!targets.length) return;

    if (!APPLY) {
      console.log('Dry run. Re-run with APPLY=true to delete.');
      return;
    }

    const ids = targets.map((t) => t.faceId);
    for (let i = 0; i < ids.length; i += 4000) {
      const res = await rek.send(
        new DeleteFacesCommand({ CollectionId: FACE_COLLECTION_ID, FaceIds: ids.slice(i, i + 4000) }),
      );
      console.log(`Deleted ${res.DeletedFaces?.length ?? 0} face(s).`);
    }

    const targetUsers = [...new Set(targets.map((t) => t.userId).filter(Boolean))];
    const upd = ALL
      ? await dataSource.query(`UPDATE kyc_verifications SET face_indexed = false WHERE face_indexed = true`)
      : await dataSource.query(
          `UPDATE kyc_verifications SET face_indexed = false WHERE user_id::text = ANY($1)`,
          [targetUsers],
        );
    console.log(`Reset face_indexed on ${upd?.[1] ?? '?'} kyc_verifications row(s).`);

    const left = await listFaces();
    console.log(`Faces remaining in collection: ${left.length}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error((error as Error)?.name, (error as Error)?.message);
  process.exit(1);
});
