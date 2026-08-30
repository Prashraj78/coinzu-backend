import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RatesQueryDto {
  @ApiPropertyOptional({
    example: 12000,
    description: 'Gems to price. Returns exactly what converting them would pay.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gem_amount?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Coins to price. Returns exactly what converting them would pay.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coin_amount?: number;
}
