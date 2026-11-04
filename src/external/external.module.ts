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
import { RewardtymExternal } from './rewardtym.external';
import { TelegramExternal } from './telegram.external';
import { ReloadlyProvider } from './gift-cards/reloadly.provider';
import { GiftCardProviderRegistry } from './gift-cards/gift-card-provider.registry';
import { GIFT_CARD_PROVIDERS } from './gift-cards/gift-card-provider.interface';
import { SettingsModule } from '../modules/settings/settings.module';

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
  RewardtymExternal,
  TelegramExternal,
];

// Every gift-card vendor implementation. Add a class here to make it selectable.
const GIFT_CARD_PROVIDER_CLASSES = [ReloadlyProvider];

const GIFT_CARD_PROVISION = [
  ...GIFT_CARD_PROVIDER_CLASSES,
  {
    provide: GIFT_CARD_PROVIDERS,
    useFactory: (...providers: ReloadlyProvider[]) => providers,
    inject: GIFT_CARD_PROVIDER_CLASSES,
  },
  GiftCardProviderRegistry,
];

/** Every outbound integration, injectable anywhere without extra imports. */
@Global()
@Module({
  imports: [SettingsModule],
  providers: [...EXTERNALS, ...GIFT_CARD_PROVISION],
  exports: [...EXTERNALS, GiftCardProviderRegistry],
})
export class ExternalModule {}
