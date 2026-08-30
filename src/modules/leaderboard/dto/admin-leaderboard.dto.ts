import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import type { LeaderboardWindow } from '../leaderboard.service';

const WINDOWS = ['today', 'week', 'month', 'all_time'] as const;

export class AdminLeaderboardDto extends ListQueryDto {
  @ApiPropertyOptional({
    enum: WINDOWS,
    description: 'Preset range. Ignored when date_from or date_end is sent.',
  })
  @IsOptional()
  @IsIn(WINDOWS)
  window?: (typeof WINDOWS)[number];

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Custom range start, UTC, yyyy-MM-dd. Overrides `window`.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Custom range end, UTC, yyyy-MM-dd inclusive. Overrides `window`.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;

  @ApiPropertyOptional({
    example: 'shubham',
    description: "Case-insensitive match against the user's email or name.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'Only users who earned at least this many coins in the range.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_coins?: number;

  @ApiPropertyOptional({ example: 'IN', description: 'ISO country code, exact match.' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

export type { LeaderboardWindow };
