import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CreateCollectionCommand,
  DetectFacesCommand,
  IndexFacesCommand,
  ListFacesCommand,
  RekognitionClient,
  ResourceAlreadyExistsException,
  SearchFacesByImageCommand,
} from '@aws-sdk/client-rekognition';
import { Env } from '../common/config/env';
import { CzKycErrorCodes } from '../common/errors/error.constants';

/** Sharpness below this reads as a photo of a screen or a shaky hand. */
const MIN_SHARPNESS = 20;
/** An attribute only counts against the user when Rekognition is sure of it. */
const MIN_ATTRIBUTE_CONFIDENCE = 90;
/** One collection holds every verified Coinzu face, each tagged with its user id. */
const FACE_COLLECTION_ID = 'coinzu-kyc-faces';

export interface FaceCheckResult {
  face_count: number;
  /** Confidence that the largest thing found is a face, 0-100. */
  confidence: number;
  eyes_open: boolean;
  sunglasses: boolean;
  face_occluded: boolean;
  sharp: boolean;
  raw: Record<string, unknown>;
}

/** A verified face already in the collection that matches the new selfie. */
export interface FaceMatch {
  user_id: string;
  similarity: number;
}

/** AWS Rekognition. The KYC service decides what these numbers mean. */
@Injectable()
export class RekognitionFaceExternal implements OnModuleInit {
  private readonly logger = new Logger(RekognitionFaceExternal.name);
  private readonly client: RekognitionClient;

  constructor() {
    this.client = new RekognitionClient({
      region: Env.aws.region,
      credentials: {
        accessKeyId: Env.aws.accessKeyId,
        secretAccessKey: Env.aws.secretAccessKey,
      },
    });
  }

  /**
   * Create the collection up front so the very first selfie is matched against
   * a real collection, not a missing one. Without this, whoever verifies before
   * anyone has been indexed falls through `searchFace`'s not-found path and is
   * never checked for duplicates.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.ensureCollection();
    } catch (error) {
      // A startup failure here must not crash boot; indexFace/searchFace retry
      // the ensure on their own path, and this is logged for visibility.
      this.logger.error(
        `Rekognition collection bootstrap failed: ${this.reason(error)}`,
      );
    }
  }

  async detectFaces(image: Buffer): Promise<FaceCheckResult> {
    const command = new DetectFacesCommand({
      Image: { Bytes: image },
      Attributes: ['ALL'],
    });

    let response;
    try {
      response = await this.client.send(command);
    } catch (error) {
      // Never log the error object itself — an AWS SDK error can carry the
      // signed request, and with it the access key id.
      this.logger.error(`Rekognition DetectFaces failed: ${this.reason(error)}`);
      throw new ServiceUnavailableException({
        cz_error_code: CzKycErrorCodes.FACE_SERVICE_UNAVAILABLE,
      });
    }

    const faces = response.FaceDetails ?? [];
    const first = faces[0];

    return {
      face_count: faces.length,
      confidence: first?.Confidence ?? 0,
      eyes_open: this.isTrue(first?.EyesOpen),
      sunglasses: this.isTrue(first?.Sunglasses),
      face_occluded: this.isTrue(first?.FaceOccluded),
      sharp: (first?.Quality?.Sharpness ?? 0) >= MIN_SHARPNESS,
      raw: { FaceDetails: faces } as Record<string, unknown>,
    };
  }

  /**
   * The highest-scoring verified face already in the collection, if any reaches
   * `threshold`. The ExternalImageId we stored is the owning user's id.
   */
  async searchFace(image: Buffer, threshold: number): Promise<FaceMatch | null> {
    const command = new SearchFacesByImageCommand({
      CollectionId: FACE_COLLECTION_ID,
      Image: { Bytes: image },
      FaceMatchThreshold: threshold,
      MaxFaces: 1,
    });

    let response;
    try {
      response = await this.client.send(command);
    } catch (error) {
      // An empty or not-yet-created collection is not an error worth failing on:
      // there is simply nothing to match against yet.
      if (this.reason(error) === 'ResourceNotFoundException') return null;
      this.logger.error(`Rekognition SearchFacesByImage failed: ${this.reason(error)}`);
      throw new ServiceUnavailableException({
        cz_error_code: CzKycErrorCodes.FACE_SERVICE_UNAVAILABLE,
      });
    }

    const match = response.FaceMatches?.[0];
    const user_id = match?.Face?.ExternalImageId;
    if (!match || !user_id) return null;
    return { user_id, similarity: match.Similarity ?? 0 };
  }

  /**
   * Enrols a verified face so later selfies can be matched against this user.
   * Returns whether the face actually landed in the collection — the caller
   * records that, so a failure here is visible and can be retried rather than
   * silently dropping the user out of every future duplicate check.
   */
  async indexFace(image: Buffer, user_id: string): Promise<boolean> {
    await this.ensureCollection();
    try {
      const response = await this.client.send(
        new IndexFacesCommand({
          CollectionId: FACE_COLLECTION_ID,
          Image: { Bytes: image },
          ExternalImageId: user_id,
          MaxFaces: 1,
          QualityFilter: 'AUTO',
        }),
      );
      // QualityFilter can drop a low-quality face: the call succeeds but indexes
      // nothing. That is not an enrolment, so report it as a failure to retry.
      const indexed = (response.FaceRecords?.length ?? 0) > 0;
      if (!indexed) {
        this.logger.warn(
          `Rekognition IndexFaces indexed no face for ${user_id} (quality filter)`,
        );
      }
      return indexed;
    } catch (error) {
      // Indexing is a follow-up to an already-granted verification — never fail
      // the user's request over it. The caller persists the failure instead.
      this.logger.error(`Rekognition IndexFaces failed: ${this.reason(error)}`);
      return false;
    }
  }

  /** Every user id currently enrolled in the collection. Used by the backfill. */
  async listIndexedUserIds(): Promise<Set<string>> {
    await this.ensureCollection();
    const ids = new Set<string>();
    let next: string | undefined;
    do {
      const response = await this.client.send(
        new ListFacesCommand({
          CollectionId: FACE_COLLECTION_ID,
          MaxResults: 1000,
          NextToken: next,
        }),
      );
      for (const face of response.Faces ?? []) {
        if (face.ExternalImageId) ids.add(face.ExternalImageId);
      }
      next = response.NextToken;
    } while (next);
    return ids;
  }

  private async ensureCollection(): Promise<void> {
    try {
      await this.client.send(
        new CreateCollectionCommand({ CollectionId: FACE_COLLECTION_ID }),
      );
    } catch (error) {
      if (error instanceof ResourceAlreadyExistsException) return;
      // The SDK does not always reify the typed error; match by name too.
      if (this.reason(error) === 'ResourceAlreadyExistsException') return;
      throw error;
    }
  }

  /** Rekognition answers every attribute with a guess and a confidence. */
  private isTrue(attribute?: { Value?: boolean; Confidence?: number }): boolean {
    if (!attribute?.Value) return false;
    return (attribute.Confidence ?? 0) >= MIN_ATTRIBUTE_CONFIDENCE;
  }

  /** The error name only. AWS messages can echo request details back. */
  private reason(error: unknown): string {
    if (error instanceof Error) return error.name;
    return 'unknown error';
  }
}
