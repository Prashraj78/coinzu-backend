import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DetectFacesCommand,
  FaceDetail,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { Env } from '../common/config/env';
import { CzKycErrorCodes } from '../common/errors/error.constants';

/** Sharpness below this reads as a photo of a screen or a shaky hand. */
const MIN_SHARPNESS = 20;
/** An attribute only counts against the user when Rekognition is sure of it. */
const MIN_ATTRIBUTE_CONFIDENCE = 90;

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

/** AWS Rekognition. The KYC service decides what these numbers mean. */
@Injectable()
export class RekognitionFaceExternal {
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
