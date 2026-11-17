import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import type { UserSignupPlatform } from '../../../database/entities/user.entity';
import { SIGNUP_METHODS, type SignupMethod } from '../../../common/utils/device-platform.util';

export class AdminEconomyQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-11',
    description: 'First day included (UTC). Defaults to today.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-11-11',
    description: 'Last day included (UTC). Defaults to today.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  date_end?: string;

  @ApiPropertyOptional({
    enum: ['app', 'web'],
    description: 'Only users who signed up there. Omit for everyone.',
  })
  @IsOptional()
  @IsIn(['app', 'web'])
  signup_platform?: UserSignupPlatform;

  @ApiPropertyOptional({
    enum: SIGNUP_METHODS,
    description: 'Only users who signed up by email, Google or Telegram. Omit for everyone.',
  })
  @IsOptional()
  @IsIn(SIGNUP_METHODS)
  signup_method?: SignupMethod;
}
