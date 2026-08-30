import { ApiPropertyOptional } from '@nestjs/swagger';
import { PUSH_CATEGORIES } from './push-message.dto';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

const PLATFORMS = ['ios', 'android', 'web'] as const;
const STATUSES = ['active', 'suspended', 'banned', 'deleted'] as const;
const KYC = ['none', 'pending', 'verified', 'rejected', 'manual_review'] as const;
const TIERS = ['silver', 'gold', 'platinum', 'diamond'] as const;

/**
 * Every filter is optional and combines as AND. Sending none targets everyone
 * with a live push token.
 */
export class PreviewAudienceDto {
  @ApiPropertyOptional({ type: [String], description: 'Target these exact users.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  cz_user_ids?: string[];

  @ApiPropertyOptional({ type: [String], example: ['IN', 'US'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(250)
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  countries?: string[];

  @ApiPropertyOptional({ enum: PLATFORMS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(PLATFORMS, { each: true })
  platforms?: Array<(typeof PLATFORMS)[number]>;

  @ApiPropertyOptional({ enum: STATUSES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(STATUSES, { each: true })
  statuses?: string[];

  @ApiPropertyOptional({ enum: KYC, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(KYC, { each: true })
  kyc_statuses?: string[];

  @ApiPropertyOptional({ enum: TIERS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(TIERS, { each: true })
  tiers?: string[];

  @ApiPropertyOptional({ example: 1000, description: 'Lifetime coins earned, at least.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_coins?: number;

  @ApiPropertyOptional({
    enum: PUSH_CATEGORIES,
    default: 'announcement',
    description:
      'What the message is about. Users who muted this category drop out of the audience; transaction and system are never mutable.',
  })
  @IsOptional()
  @IsIn(PUSH_CATEGORIES)
  category?: (typeof PUSH_CATEGORIES)[number];

  @ApiPropertyOptional({
    default: true,
    description:
      'Leave out anyone whose local time is inside the platform quiet hours. Ignored for transaction and system.',
  })
  @IsOptional()
  @IsBoolean()
  respect_quiet_hours?: boolean;
}
