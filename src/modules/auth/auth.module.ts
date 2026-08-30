import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { LinkTokenService } from './link-token.service';
import { PasswordResetService } from './password-reset.service';
import { AuthPagesController } from './pages/auth-pages.controller';
import { AuthPagesService } from './pages/auth-pages.service';

@Module({
  imports: [UsersModule, ReferralsModule],
  controllers: [AuthController, AuthPagesController],
  providers: [AuthService, EmailVerificationService, LinkTokenService, PasswordResetService, AuthPagesService],
  exports: [AuthService],
})
export class AuthModule {}
