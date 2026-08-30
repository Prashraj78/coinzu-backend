import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const STATUSES = ['live', 'coming_soon', 'paused'] as const;
const CADENCES = ['none', 'daily', 'weekly'] as const;
const DRAW_STATUSES = ['open', 'drawing', 'resolved'] as const;

export class HowItWorksStepDto {
  @ApiProperty({ example: 'Come back every day' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'The draw refreshes at midnight UTC.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateRewardGameDto {
  @ApiPropertyOptional({ example: 'Daily Lucky Draw' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'Win up to 5,000 Coins' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/rewards/daily.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon_url?: string;

  @ApiPropertyOptional({ example: 5000, description: 'The "5,000 Coins" line on the card.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  headline_prize_coins?: number;

  @ApiPropertyOptional({ example: 10, description: 'Gems one entry costs.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  entry_cost_gems?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  min_entries?: number;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  max_entries?: number;

  @ApiPropertyOptional({ example: [5, 10, 25, 50, 100, 250], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  entry_packs?: number[];

  @ApiPropertyOptional({ type: [HowItWorksStepDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => HowItWorksStepDto)
  how_it_works?: HowItWorksStepDto[];

  @ApiPropertyOptional({ example: 'https://coinzu.app/terms' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  terms_url?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ enum: CADENCES })
  @IsOptional()
  @IsIn(CADENCES)
  cadence?: (typeof CADENCES)[number];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class RewardPrizeDto {
  @ApiPropertyOptional({ example: 1, description: 'Defaults to the array position.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rank?: number;

  @ApiProperty({ example: '1st Prize' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @ApiProperty({ example: 5000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  reward_coins: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  reward_gems: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Instant games only. A draw ranks its prizes instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1_000_000)
  probability_weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SavePrizesDto {
  @ApiProperty({ type: [RewardPrizeDto], description: 'The whole ladder, 1–20 rows.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RewardPrizeDto)
  prizes: RewardPrizeDto[];
}

export class PayoutRuleDto {
  @ApiProperty({ example: 0, description: 'Inclusive participant floor for this band.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  min_participants: number;

  @ApiProperty({ example: 5000, description: 'Coins shared across the winners.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  prize_pool_coins: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  winners_count: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SavePayoutRulesDto {
  @ApiProperty({ type: [PayoutRuleDto], description: 'The whole ladder, 1–20 bands.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PayoutRuleDto)
  rules: PayoutRuleDto[];
}

export class DrawsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'daily_lucky_draw' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  slug?: string;

  @ApiPropertyOptional({ enum: DRAW_STATUSES })
  @IsOptional()
  @IsIn(DRAW_STATUSES)
  status?: (typeof DRAW_STATUSES)[number];

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-08-30' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class RewardDashboardDto {
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-08-30' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ example: 'wheel_of_fortune' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  slug?: string;
}
