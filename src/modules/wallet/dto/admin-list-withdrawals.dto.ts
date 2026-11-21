import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import {
  USDT_NETWORKS,
  type UsdtNetwork,
  type WithdrawalStatus,
} from '../../../database/entities/withdrawal-request.entity';
import type {
  UserKycStatus,
  UserSignupPlatform,
} from '../../../database/entities/user.entity';

const STATUSES = ['pending', 'approved', 'rejected', 'paid'] as const;
const KYC_STATUSES = [
  'none',
  'pending',
  'verified',
  'rejected',
  'manual_review',
] as const;
const SIGNUP_PLATFORMS = ['app', 'web'] as const;

/** Filters shared by the admin withdrawals list and its summary tiles. */
export class AdminWithdrawalFiltersDto extends ListQueryDto {
  @ApiPropertyOptional({
    example: '0x3f1c',
    description: 'Matches email, name, cz_user_id, wallet_address or tx_hash.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: WithdrawalStatus;

  @ApiPropertyOptional({ enum: USDT_NETWORKS })
  @IsOptional()
  @IsIn(USDT_NETWORKS)
  network?: UsdtNetwork;

  @ApiPropertyOptional({ enum: SIGNUP_PLATFORMS })
  @IsOptional()
  @IsIn(SIGNUP_PLATFORMS)
  signup_platform?: UserSignupPlatform;

  @ApiPropertyOptional({ enum: KYC_STATUSES })
  @IsOptional()
  @IsIn(KYC_STATUSES)
  kyc_status?: UserKycStatus;

  @ApiPropertyOptional({
    example: 10,
    description: 'Payout USD at least this.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_usd?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Payout USD at most this.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_usd?: number;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Requested on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Requested on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;
}
