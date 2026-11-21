import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { SIGNUP_METHODS, type SignupMethod } from '../../../common/utils/device-platform.util';

// `blocked` is a filter-only value: suspended or banned.
const STATUSES = ['active', 'suspended', 'banned', 'deleted', 'blocked'] as const;
const KYC_STATUSES = [
  'none',
  'pending',
  'verified',
  'rejected',
  'manual_review',
] as const;
const TIERS = ['silver', 'gold', 'platinum', 'diamond'] as const;
const PLATFORMS = ['app', 'web'] as const;

export class AdminListUsersDto extends ListQueryDto {
  @ApiPropertyOptional({
    example: 'shubham@coinzu.app',
    description: 'Case-insensitive match against email, name, phone, Telegram id or contact handle.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: STATUSES, description: 'Account status; `blocked` matches suspended and banned together.' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ enum: KYC_STATUSES, description: 'Exact KYC state.' })
  @IsOptional()
  @IsIn(KYC_STATUSES)
  kyc_status?: (typeof KYC_STATUSES)[number];

  @ApiPropertyOptional({ enum: TIERS, description: 'Exact loyalty tier.' })
  @IsOptional()
  @IsIn(TIERS)
  tier?: (typeof TIERS)[number];

  @ApiPropertyOptional({ enum: PLATFORMS, description: 'Where the account was created.' })
  @IsOptional()
  @IsIn(PLATFORMS)
  signup_platform?: (typeof PLATFORMS)[number];

  @ApiPropertyOptional({ enum: SIGNUP_METHODS, description: 'How the account signed up: email, Google or Telegram.' })
  @IsOptional()
  @IsIn(SIGNUP_METHODS)
  signup_method?: SignupMethod;

  @ApiPropertyOptional({
    example: 'IN',
    description: 'ISO country code, exact match.',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Joined on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Joined on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;

  @ApiPropertyOptional({
    example: 'first-blood',
    description: 'Only users who have unlocked this medal, by slug.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  medal?: string;
}
