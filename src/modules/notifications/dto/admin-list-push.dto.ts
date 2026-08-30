import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { PUSH_CATEGORIES } from './push-message.dto';

const STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'partial',
  'failed',
  'cancelled',
] as const;
const AUDIENCE = ['all', 'users', 'country', 'platform', 'segment'] as const;

export class AdminListPushDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'bonus' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ enum: AUDIENCE })
  @IsOptional()
  @IsIn(AUDIENCE)
  audience_type?: (typeof AUDIENCE)[number];

  @ApiPropertyOptional({ enum: PUSH_CATEGORIES })
  @IsOptional()
  @IsIn(PUSH_CATEGORIES)
  category?: (typeof PUSH_CATEGORIES)[number];

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-08-29' })
  @IsOptional()
  @IsDateString()
  date_end?: string;
}
