import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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

const RARITY = ['common', 'rare', 'epic', 'rarest'] as const;
const ACTIONS = ['spin', 'quiz', 'scratch', 'offers', 'referrals', 'games'] as const;
const QUIZ_STATES = ['past', 'today', 'upcoming'] as const;
const SOURCES = ['spin', 'scratch', 'quiz', 'challenge', 'chest'] as const;
const CURRENCIES = ['coin', 'gem'] as const;
const GRANULARITY = ['day', 'week'] as const;

export class UpdateChallengeDto {
  @ApiPropertyOptional({ example: 'Spin the Lucky Wheel' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'Spin the wheel 1 time' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 2, description: 'How many actions finish it.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  target_count?: number;

  @ApiPropertyOptional({ enum: ACTIONS, description: 'Where the tile sends the app.' })
  @IsOptional()
  @IsIn(ACTIONS)
  action?: (typeof ACTIONS)[number];



  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/challenges/spin.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon_url?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SpinSegmentDto {
  @ApiProperty({ example: '1000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @ApiProperty({ example: 1000 })
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



  @ApiProperty({
    example: 12,
    description: 'Relative weight, not a percentage. The odds are normalised.',
  })
  @Type(() => Number)
  @Min(0)
  @Max(1_000_000)
  probability_weight: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SaveSpinWheelDto {
  @ApiProperty({ type: [SpinSegmentDto], description: 'The whole wheel, 2–20 segments.' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SpinSegmentDto)
  segments: SpinSegmentDto[];
}

export class ScratchCardDto {
  @ApiProperty({ example: '100 coins' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @ApiProperty({ example: 100 })
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
    example: 2000,
    description: 'Upper end of the payout range. Omit to always pay the exact amount.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  reward_coins_max?: number;

  @ApiPropertyOptional({ example: 5, description: 'Upper end of the gem range.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  reward_gems_max?: number;

  @ApiProperty({ example: 26, description: 'Relative weight, not a percentage.' })
  @Type(() => Number)
  @Min(0)
  @Max(1_000_000)
  probability_weight: number;

  @ApiPropertyOptional({
    enum: RARITY,
    description:
      'Only users whose best medal reaches this tier can win it. Omit for everyone.',
  })
  @IsOptional()
  @IsIn(RARITY)
  min_medal_rarity?: (typeof RARITY)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SaveScratchCardsDto {
  @ApiProperty({ type: [ScratchCardDto], description: 'The whole prize pool, 2–20.' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ScratchCardDto)
  cards: ScratchCardDto[];
}

export class UpsertQuizDto {
  @ApiProperty({ example: '2026-09-01', description: 'One quiz per day.' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'What is the name of the toy cowboy in Toy Story?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({ example: ['SMITH', 'WOODY', 'JACK'], description: 'Exactly 3.' })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  options: string[];

  @ApiProperty({ example: 'WOODY', description: 'Must be one of the options.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  correct_option: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/quiz/toystory.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;




  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListQuizzesDto {
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

  @ApiPropertyOptional({ example: '2026-08-25', description: 'Window start.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Window end.' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'cowboy', description: 'Matches question or options.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: QUIZ_STATES })
  @IsOptional()
  @IsIn(QUIZ_STATES)
  state?: (typeof QUIZ_STATES)[number];

  @ApiPropertyOptional({ description: 'Only quizzes that do or do not carry an image.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  has_image?: boolean;


  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  is_active?: boolean;
}

export class RepeatQuizDto {
  @ApiProperty({ example: '2026-09-19', description: 'The day to copy this quiz onto.' })
  @IsDateString()
  date: string;
}

export class DailyDashboardDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'Defaults to 30 days ago.' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-08-30', description: 'Defaults to today.' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ enum: SOURCES, description: 'Narrow to one payout source.' })
  @IsOptional()
  @IsIn(SOURCES)
  source?: (typeof SOURCES)[number];

  @ApiPropertyOptional({ enum: CURRENCIES })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: (typeof CURRENCIES)[number];

  @ApiPropertyOptional({ enum: GRANULARITY, description: 'Buckets for the series.' })
  @IsOptional()
  @IsIn(GRANULARITY)
  granularity?: (typeof GRANULARITY)[number];

  @ApiPropertyOptional({ example: 10, description: 'How many rows in the leaderboards.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  top?: number;
}

export class UpdateDailyConfigDto {
  @ApiPropertyOptional({ example: 1000, description: 'Coins the master chest pays.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  chest_coins?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Gems the master chest pays.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  chest_gems?: number;

}
