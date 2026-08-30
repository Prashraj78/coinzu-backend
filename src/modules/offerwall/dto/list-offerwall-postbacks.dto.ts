import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

const STATUSES = [
  'credited',
  'reversed',
  'duplicate',
  'invalid_secret',
  'user_not_found',
  'invalid_payload',
] as const;

export class ListOfferwallPostbacksDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Filter to one partner.' })
  @IsOptional()
  @IsUUID()
  partner_id?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Received on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Received on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;
}
