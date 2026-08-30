import { Global, Module } from '@nestjs/common';
import { R2StorageExternal } from './r2-storage.external';
import { RedisExternal } from './redis.external';
import { RekognitionFaceExternal } from './rekognition-face.external';
import { SendgridMailExternal } from './sendgrid-mail.external';
import { GoogleAuthExternal } from './google-auth.external';
import { GiftCardExternal } from './gift-card.external';
import { OfferwallExternal } from './offerwall.external';
import { GeoLookupExternal } from './geo-lookup.external';
import { FirebasePushExternal } from './firebase-push.external';

const EXTERNALS = [
  R2StorageExternal,
  RedisExternal,
  RekognitionFaceExternal,
  SendgridMailExternal,
  GoogleAuthExternal,
  GiftCardExternal,
  OfferwallExternal,
  GeoLookupExternal,
  FirebasePushExternal,
];

/** Every outbound integration, injectable anywhere without extra imports. */
@Global()
@Module({
  providers: EXTERNALS,
  exports: EXTERNALS,
})
export class ExternalModule {}
