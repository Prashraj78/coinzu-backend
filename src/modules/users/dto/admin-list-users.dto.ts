import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

const STATUSES = ['active', 'suspended', 'banned', 'deleted'] as const;
const KYC_STATUSES = [
  'none',
  'pending',
  'verified',
  'rejected',
  'manual_review',
] as const;
const TIERS = ['silver', 'gold', 'platinum', 'diamond'] as const;

export class AdminListUsersDto extends ListQueryDto {
  @ApiPropertyOptional({
    example: 'shubham@coinzu.app',
    description: 'Case-insensitive match against email, name, or phone.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: STATUSES, description: 'Exact account status.' })
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
