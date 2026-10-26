/**
 * Repairs the KYC duplicate-face guard.
 *
 * Background: every verified selfie is supposed to be enrolled in the
 * Rekognition collection so a later selfie of the same person is caught as a
 * duplicate. Enrolment used to be fire-and-forget, and any user verified before
 * the collection first existed was never enrolled — so they, and any second
 * account they open, sail through the duplicate check.
 *
 * This script, in report mode (default), does three read-only things:
 *   1. Lists every verified user whose face is NOT in the collection.
 *   2. Re-indexes those faces and marks kyc_verifications.face_indexed = true.
 *   3. Compares every verified face against every other and reports duplicate
 *      pairs (same person, two accounts), oldest account first.
 *
 * It changes data only with APPLY=true, and bans the LATER account of each
 * duplicate pair only with BAN_DUPLICATES=true (which implies APPLY). The
 * earliest-verified account in a pair is always left verified and active.
 *
 * Run from project root:
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-kyc-faces.ts
 *   APPLY=true npx ts-node -r tsconfig-paths/register scripts/backfill-kyc-faces.ts
 *   APPLY=true BAN_DUPLICATES=true npx ts-node -r tsconfig-paths/register scripts/backfill-kyc-faces.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  CompareFacesCommand,
  CreateCollectionCommand,
  IndexFacesCommand,
  ListFacesCommand,
  RekognitionClient,
  ResourceAlreadyExistsException,
} from '@aws-sdk/client-rekognition';

const FACE_COLLECTION_ID = 'coinzu-kyc-faces';
const MATCH_THRESHOLD = 90; // same as kyc_face_match_threshold default
const APPLY = process.env.APPLY === 'true';
const BAN_DUPLICATES = process.env.BAN_DUPLICATES === 'true';

interface VerifiedRow {
  cz_kyc_verification_id: string;
  user_id: string;
  email: string;
  selfie_url: string;
  verified_at: Date;
  face_indexed: boolean;
}

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

async function ensureCollection(): Promise<void> {
  try {
    await rek.send(new CreateCollectionCommand({ CollectionId: FACE_COLLECTION_ID }));
    console.log(`Created collection ${FACE_COLLECTION_ID}.`);
  } catch (error) {
    if (
      error instanceof ResourceAlreadyExistsException ||
      (error as Error)?.name === 'ResourceAlreadyExistsException'
    ) {
      return;
    }
    throw error;
  }
}

async function indexedUserIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let next: string | undefined;
  do {
    const res = await rek.send(
      new ListFacesCommand({
        CollectionId: FACE_COLLECTION_ID,
        MaxResults: 1000,
        NextToken: next,
      }),
    );
    for (const f of res.Faces ?? []) if (f.ExternalImageId) ids.add(f.ExternalImageId);
    next = res.NextToken;
  } while (next);
  return ids;
}

async function fetchSelfie(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function run() {
  await ensureCollection();
  await dataSource.initialize();
  try {
    // The one verified row per user is the latest; a user only ever holds one
    // verified row because verification stops once kyc_status is 'verified'.
    const rows: VerifiedRow[] = await dataSource.query(
      `SELECT k.cz_kyc_verification_id, k.user_id, u.email, k.selfie_url,
              k.reviewed_at AS verified_at, k.face_indexed
         FROM kyc_verifications k
         JOIN users u ON u.cz_user_id = k.user_id
        WHERE k.status = 'verified'
        ORDER BY k.reviewed_at ASC`,
    );
    console.log(`Verified selfies on record: ${rows.length}`);

    const alreadyIndexed = await indexedUserIds();
    console.log(`Faces currently in collection: ${alreadyIndexed.size}\n`);

    // ---- 1 & 2: find and re-enrol un-indexed verified faces -----------------
    const missing = rows.filter((r) => !alreadyIndexed.has(r.user_id));
    console.log(`=== UN-ENROLLED verified faces: ${missing.length} ===`);
    for (const r of missing) console.log(`  ${r.email}  user=${r.user_id}  verified=${r.verified_at?.toISOString?.() ?? r.verified_at}`);

    // Cache every selfie buffer once; both the re-index and the pairwise
    // compare below reuse them.
    const buffers = new Map<string, Buffer>();
    for (const r of rows) {
      try {
        buffers.set(r.user_id, await fetchSelfie(r.selfie_url));
      } catch (e) {
        console.log(`  ! could not fetch selfie for ${r.email}: ${(e as Error).message}`);
      }
    }

    if (missing.length) {
      console.log(`\n--- re-indexing ${missing.length} face(s) ${APPLY ? '(APPLY)' : '(dry run)'} ---`);
      for (const r of missing) {
        const buf = buffers.get(r.user_id);
        if (!buf) continue;
        if (!APPLY) {
          console.log(`  would index ${r.email}`);
          continue;
        }
        const res = await rek.send(
          new IndexFacesCommand({
            CollectionId: FACE_COLLECTION_ID,
            Image: { Bytes: buf },
            ExternalImageId: r.user_id,
            MaxFaces: 1,
            QualityFilter: 'AUTO',
          }),
        );
        const ok = (res.FaceRecords?.length ?? 0) > 0;
        if (ok) {
          await dataSource.query(
            `UPDATE kyc_verifications SET face_indexed = true WHERE cz_kyc_verification_id = $1`,
            [r.cz_kyc_verification_id],
          );
          alreadyIndexed.add(r.user_id);
          console.log(`  indexed ${r.email}`);
        } else {
          console.log(`  ! Rekognition indexed no face for ${r.email} (quality filter)`);
        }
      }
    }

    // Also reconcile the flag for rows that ARE in the collection but whose
    // face_indexed is still false (e.g. this column was just added).
    if (APPLY) {
      for (const r of rows) {
        if (alreadyIndexed.has(r.user_id) && !r.face_indexed) {
          await dataSource.query(
            `UPDATE kyc_verifications SET face_indexed = true WHERE cz_kyc_verification_id = $1`,
            [r.cz_kyc_verification_id],
          );
        }
      }
    }

    // ---- 3: duplicate pairs across all verified faces -----------------------
    console.log(`\n=== DUPLICATE PAIRS (similarity >= ${MATCH_THRESHOLD}%) ===`);
    const dupPairs: Array<{ keep: VerifiedRow; ban: VerifiedRow; similarity: number }> = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];
        const ba = buffers.get(a.user_id);
        const bb = buffers.get(b.user_id);
        if (!ba || !bb) continue;
        let sim = 0;
        try {
          const res = await rek.send(
            new CompareFacesCommand({
              SourceImage: { Bytes: ba },
              TargetImage: { Bytes: bb },
              SimilarityThreshold: MATCH_THRESHOLD,
            }),
          );
          sim = res.FaceMatches?.[0]?.Similarity ?? 0;
        } catch (e) {
          console.log(`  ! compare ${a.email} vs ${b.email} failed: ${(e as Error).name}`);
          continue;
        }
        if (sim >= MATCH_THRESHOLD) {
          // rows are sorted oldest-first, so a is the keeper, b the later dupe.
          dupPairs.push({ keep: a, ban: b, similarity: sim });
          console.log(`  ${sim.toFixed(2)}%  KEEP ${a.email} (${a.user_id})  ->  BAN ${b.email} (${b.user_id})`);
        }
      }
    }
    if (!dupPairs.length) console.log('  none');

    // ---- optional: ban the later account of each duplicate pair -------------
    if (dupPairs.length) {
      const toBan = [...new Set(dupPairs.map((p) => p.ban.user_id))];
      if (BAN_DUPLICATES && APPLY) {
        console.log(`\n--- banning ${toBan.length} duplicate account(s) (BAN_DUPLICATES) ---`);
        for (const id of toBan) {
          await dataSource.query(
            `UPDATE users SET status = 'banned', kyc_status = 'rejected' WHERE cz_user_id = $1`,
            [id],
          );
          console.log(`  banned ${id}`);
        }
      } else {
        console.log(`\n${toBan.length} account(s) would be banned. Re-run with APPLY=true BAN_DUPLICATES=true to ban them.`);
      }
    }

    console.log(`\nDone. ${APPLY ? 'Changes applied.' : 'Report only — no data changed.'}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
