import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { Env } from '../common/config/env';
import { CzStorageErrorCodes } from '../common/errors/error.constants';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Cloudflare R2 over the S3 API, using the same bucket and keys as Rewardtym.
 * Validation, key naming and URL building all live here.
 */
@Injectable()
export class R2StorageExternal {
  private readonly logger = new Logger(R2StorageExternal.name);
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: Env.r2.endpoint || undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId: Env.r2.accessKeyId,
        secretAccessKey: Env.r2.secretAccessKey,
      },
    });
  }

  validateImage(file?: UploadedFile): UploadedFile {
    if (!file) {
      throw new BadRequestException({
        cz_error_code: CzStorageErrorCodes.FILE_REQUIRED,
      });
    }
    if (!MIME_TO_EXT[file.mimetype]) {
      throw new BadRequestException({
        cz_error_code: CzStorageErrorCodes.FILE_TYPE_NOT_ALLOWED,
      });
    }
    if (file.size > Env.r2.maxFileBytes) {
      throw new BadRequestException({
        cz_error_code: CzStorageErrorCodes.FILE_TOO_LARGE,
      });
    }
    return file;
  }

  /** Stores the file and returns its public URL. */
  async upload(folder: string, file: UploadedFile): Promise<string> {
    const extension = MIME_TO_EXT[file.mimetype] ?? 'jpg';
    const key = `${folder}/${crypto.randomUUID()}.${extension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: Env.r2.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      this.logger.error(`Upload failed for ${key}: ${String(error)}`);
      throw new InternalServerErrorException({
        cz_error_code: CzStorageErrorCodes.UPLOAD_FAILED,
      });
    }

    return this.publicUrl(key);
  }

  /** Failures are logged, never thrown — a stale object is not worth a 500. */
  async remove(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: Env.r2.bucketName, Key: key }),
      );
    } catch (error) {
      this.logger.warn(`Delete failed for ${key}: ${String(error)}`);
    }
  }

  private publicUrl(key: string): string {
    return `${Env.r2.publicUrl.replace(/\/$/, '')}/${key}`;
  }
}
