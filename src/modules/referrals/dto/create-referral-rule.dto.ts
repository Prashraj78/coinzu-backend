import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { ReferralTrigger } from '../../../database/entities/referral-reward-rule.entity';

const TRIGGERS = [
  'signup',
  'email_verified',
  'onboarding_completed',
  'kyc_verified',
  'first_withdrawal',
  'first_redeem',
  'offers_completed',
  'daily_checkins',
  'streak_reached',
  'withdrawals_completed',
  'redeems_completed',
  'referrals_made',
] as const;

export class CreateReferralRuleDto {
  @ApiProperty({ enum: TRIGGERS })
  @IsIn(TRIGGERS)
  trigger: ReferralTrigger;

  @ApiProperty({ example: 500, description: 'Coins paid to the referrer.' })
  @IsInt()
  @Min(0)
  reward_coins: number;

  @ApiPropertyOptional({ example: 100, description: 'Gems paid to the referrer.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reward_gems?: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Only used by `offers_completed` — offers the friend must finish. Forced to 1 on other triggers.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  threshold?: number;

  @ApiPropertyOptional({ example: 'Friend completes 10 offers' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
