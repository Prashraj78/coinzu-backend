import * as crypto from 'crypto';
import { Env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

/** ENCRYPTION_KEY of any length is hashed down to the 32 bytes AES needs. */
function secretKey(): Buffer {
  return crypto.createHash('sha256').update(Env.encryptionKey).digest();
}

/** Returns "iv:authTag:cipherText", all base64. */
export function encryptText(plainText: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptText(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    secretKey(),
    Buffer.from(ivPart, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function encryptJson(value: unknown): string {
  return encryptText(JSON.stringify(value));
}

export function decryptJson<T>(payload: string): T {
  return JSON.parse(decryptText(payload)) as T;
}
