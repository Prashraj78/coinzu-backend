import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

const RARITY = ['common', 'rare', 'epic', 'rarest'] as const;
const STATE = ['unlocked', 'in_progress'] as const;

export class AdminListAchievementsDto {
  @ApiPropertyOptional({ example: 'offer' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: RARITY })
  @IsOptional()
  @IsIn(RARITY)
  rarity?: (typeof RARITY)[number];
}

/** Filters for the users holding one medal. */
export class AdminMedalHoldersDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'prashant' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    enum: STATE,
    description: 'Unlocked, or still working towards it.',
  })
  @IsOptional()
  @IsIn(STATE)
  state?: (typeof STATE)[number];

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ enum: ['silver', 'gold', 'platinum', 'diamond'] })
  @IsOptional()
  @IsIn(['silver', 'gold', 'platinum', 'diamond'])
  tier?: string;

  @ApiPropertyOptional({ enum: ['none', 'pending', 'verified', 'rejected', 'manual_review'] })
  @IsOptional()
  @IsIn(['none', 'pending', 'verified', 'rejected', 'manual_review'])
  kyc_status?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'banned', 'deleted'] })
  @IsOptional()
  @IsIn(['active', 'suspended', 'banned', 'deleted'])
  status?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-08-30' })
  @IsOptional()
  @IsString()
  date_end?: string;
}
