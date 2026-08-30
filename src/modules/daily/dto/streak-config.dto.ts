import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** One tile on the 30-day board. */
export class StreakDayDto {
  @ApiProperty({ example: 7, description: 'Position on the board, 1 to 30.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  day_number: number;

  @ApiProperty({ example: 300, description: 'Coins paid on this day. 0 for none.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reward_coins: number;

  @ApiProperty({ example: 200, description: 'Gems paid on this day. 0 for none.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reward_gems: number;

  @ApiPropertyOptional({
    example: 'Week 1 bonus',
    description: 'What the app prints on the tile.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Drawn with the gold border on the board.',
  })
  @IsOptional()
  @IsBoolean()
  is_milestone?: boolean;
}

/**
 * The whole ladder in one write. The board is a fixed 30-day cycle, so it is
 * saved as a set rather than a row at a time — a half-saved board would leave
 * a day nobody can claim.
 */
export class SaveStreakLadderDto {
  @ApiProperty({ type: [StreakDayDto], description: 'All 30 days, in any order.' })
  @IsArray()
  @ArrayMinSize(30)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => StreakDayDto)
  days: StreakDayDto[];
}
