import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const SECTION_KEYS = ['top_picks', 'featured', 'recommended'];

export class ListSectionDto {
  @ApiProperty({
    enum: SECTION_KEYS,
    description: 'Which home section to page through.',
  })
  @IsIn(SECTION_KEYS)
  section: string;

  @ApiPropertyOptional({ example: 1, description: '1-based page number.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Rows per page, max 50.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
