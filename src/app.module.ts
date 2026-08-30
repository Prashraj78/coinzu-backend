import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Env } from './common/config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ExternalModule } from './external/external.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { OffersModule } from './modules/offers/offers.module';
import { DailyModule } from './modules/daily/daily.module';
import { GamesModule } from './modules/games/games.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { RedeemModule } from './modules/redeem/redeem.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { KycModule } from './modules/kyc/kyc.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import { CronModule } from './modules/cron/cron.module';
import { DropdownModule } from './modules/dropdown/dropdown.module';
import { OfferwallModule } from './modules/offerwall/offerwall.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(Env.db.typeOrmConf),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { ttl: Env.throttle.ttlSeconds * 1000, limit: Env.throttle.limit },
    ]),
    // Global helpers other modules inject without importing.
    ExternalModule,
    SettingsModule,
    StorageModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    OffersModule,
    DailyModule,
    GamesModule,
    RewardsModule,
    RedeemModule,
    ReferralsModule,
    AchievementsModule,
    LeaderboardModule,
    KycModule,
    SupportModule,
    AdminModule,
    CronModule,
    DropdownModule,
    OfferwallModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    // Order: throttle, authenticate, authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
