import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { Env } from '../../common/config/env';
import { CzAuthErrorCodes } from '../../common/errors/error.constants';
import type { RequestUser } from '../../common/auth/request-user.types';
import { User } from '../../database/entities/user.entity';
import { UsersService } from '../users/users.service';
import { UserDevicesService } from '../users/user-devices.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailVerificationService } from './email-verification.service';
import { LinkTokenService } from './link-token.service';
import { PasswordResetService } from './password-reset.service';
import { GoogleAuthExternal } from '../../external/google-auth.external';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailLinkDto } from './dto/verify-email-link.dto';

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

interface RefreshPayload {
  cz_user_id: string;
  token_type: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly userDevicesService: UserDevicesService,
    private readonly referralsService: ReferralsService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly linkTokens: LinkTokenService,
    private readonly passwordResetService: PasswordResetService,
    private readonly googleAuth: GoogleAuthExternal,
  ) {}

  async register(dto: RegisterDto, req: Request) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    if (dto.referral_code) {
      await this.referralsService.attachReferrer(
        user.cz_user_id,
        dto.referral_code,
      );
    }

    if (dto.device) {
      await this.userDevicesService.upsert(user.cz_user_id, dto.device, req);
    }

    await this.emailVerificationService.sendVerifyLink(
      user.email,
      user.cz_user_id,
    );

    return { user: this.publicUser(user), ...this.issueTokens(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithSecret(dto.email);
    if (!user) {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.INVALID_CREDENTIALS,
      });
    }
    if (!user.password_hash) {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.PASSWORD_NOT_SET,
      });
    }

    const matches = await bcrypt.compare(dto.password, user.password_hash);
    if (!matches) {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.INVALID_CREDENTIALS,
      });
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.ACCOUNT_INACTIVE,
      });
    }

    // The select above already covers every publicUser field — no re-fetch.
    await this.usersService.touchLastLogin(user.cz_user_id);
    return { user: this.publicUser(user), ...this.issueTokens(user) };
  }

  /** Signs in with a Google ID token, creating the account on first use. */
  async googleLogin(dto: GoogleLoginDto) {
    const profile = await this.googleAuth.verifyIdToken(dto.id_token);

    let user = await this.usersService.findByGoogleId(profile.google_id);
    if (!user) user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        name: profile.name ?? undefined,
        google_id: profile.google_id,
        avatar_url: profile.avatar_url ?? undefined,
        email_verified: profile.email_verified,
      });
      if (dto.referral_code) {
        await this.referralsService.attachReferrer(
          user.cz_user_id,
          dto.referral_code,
        );
      }
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.ACCOUNT_INACTIVE,
      });
    }

    await this.usersService.touchLastLogin(user.cz_user_id);
    return { user: this.publicUser(user), ...this.issueTokens(user) };
  }

  refresh(dto: RefreshDto) {
    let payload: RefreshPayload;
    try {
      payload = jwt.verify(
        dto.refresh_token,
        Env.jwt.JWT_REFRESH_TOKEN,
      ) as RefreshPayload;
    } catch {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.REFRESH_TOKEN_INVALID,
      });
    }

    if (payload.token_type !== 'refresh') {
      throw new UnauthorizedException({
        cz_error_code: CzAuthErrorCodes.REFRESH_TOKEN_INVALID,
      });
    }

    return this.refreshForUser(payload.cz_user_id);
  }

  private async refreshForUser(cz_user_id: string) {
    const user = await this.usersService.getOrFail(cz_user_id);
    return { user: this.publicUser(user), ...this.issueTokens(user) };
  }



  /** The link-based counterpart to verifyEmailOtp, used by the browser confirm-email page. */
  async verifyEmailLink(dto: VerifyEmailLinkDto) {
    const payload = await this.linkTokens.consume('verify_email', dto.token);
    const verified = await this.usersService.markEmailVerified(payload.cz_user_id);
    return { user: this.publicUser(verified), ...this.issueTokens(verified) };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ sent: true }> {
    await this.passwordResetService.requestReset(dto.email);
    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: true }> {
    await this.passwordResetService.confirmReset(dto.token, dto.password);
    return { reset: true };
  }

  private issueTokens(user: User): TokenPair {
    const claims: RequestUser = {
      cz_user_id: user.cz_user_id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: jwt.sign(claims, Env.jwt.JWT_AUTH_TOKEN, {
        expiresIn: Env.jwt.EXPIRES_IN as jwt.SignOptions['expiresIn'],
      }),
      // Distinct secret so a leaked access secret cannot mint refresh tokens.
      refresh_token: jwt.sign(
        { cz_user_id: user.cz_user_id, token_type: 'refresh' },
        Env.jwt.JWT_REFRESH_TOKEN,
        {
          expiresIn: Env.jwt
            .REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        },
      ),
    };
  }

  /** Client-safe user shape returned by every auth endpoint. */
  private publicUser(user: User) {
    return {
      cz_user_id: user.cz_user_id,
      email: user.email,
      phone: user.phone ?? null,
      name: user.name ?? null,
      avatar_url: user.avatar_url ?? null,
      referral_code: user.referral_code,
      tier: user.tier,
      kyc_status: user.kyc_status,
      role: user.role,
      status: user.status,
      onboarding_completed: user.onboarding_completed,
      profile_completion_pct: user.profile_completion_pct,
      email_verified: Boolean(user.email_verified_at),
    };
  }
}
