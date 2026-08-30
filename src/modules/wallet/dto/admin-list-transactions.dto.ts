import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

const CURRENCIES = ['coin', 'gem'] as const;

const TYPES = [
  'earn',
  'spend',
  'withdrawal',
  'convert_in',
  'convert_out',
  'reversal',
] as const;

const SOURCE_TYPES = [
  'offer',
  'daily_checkin',
  'referral',
  'game',
  'streak',
  'withdrawal',
  'redeem',
  'lucky_draw',
  'achievement',
  'challenge',
  'convert',
  'admin_adjustment',
  'offerwall',
] as const;

export class AdminListTransactionsDto extends ListQueryDto {
  @ApiPropertyOptional({
    example: 'shubham',
    description: "Case-insensitive match against the user's email, name, or the row's note.",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Only this user’s ledger.' })
  @IsOptional()
  @IsUUID()
  cz_user_id?: string;

  @ApiPropertyOptional({ enum: CURRENCIES })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: (typeof CURRENCIES)[number];

  @ApiPropertyOptional({ enum: TYPES })
  @IsOptional()
  @IsIn(TYPES)
  type?: (typeof TYPES)[number];

  @ApiPropertyOptional({ enum: SOURCE_TYPES })
  @IsOptional()
  @IsIn(SOURCE_TYPES)
  source_type?: (typeof SOURCE_TYPES)[number];

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Moved on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Moved on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;
}
