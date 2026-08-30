import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { LeaderboardWindow } from '../leaderboard.service';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    example: 'week',
    enum: ['today', 'week', 'all_time'],
  })
  @IsOptional()
  @IsIn(['today', 'week', 'all_time'])
  window?: LeaderboardWindow;

  @ApiPropertyOptional({ example: 50, description: 'Rows to return, max 100.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
