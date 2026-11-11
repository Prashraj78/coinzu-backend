import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AdminEconomyQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-11',
    description: 'First day included (UTC). Defaults to today.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-11-11',
    description: 'Last day included (UTC). Defaults to today.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  date_end?: string;
}
