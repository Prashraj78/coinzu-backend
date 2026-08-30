import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { UserDevice } from '../../database/entities/user-device.entity';
import { WalletModule } from '../wallet/wallet.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserDevicesService } from './user-devices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDevice]),
    WalletModule,
    ReferralsModule,
    AchievementsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserDevicesService],
  exports: [UsersService, UserDevicesService],
})
export class UsersModule {}
