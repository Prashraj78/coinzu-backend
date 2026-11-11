import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class AdminListProductsDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by brand (partial match).' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ description: 'Filter by category name.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by vendor, e.g. phaze or reloadly.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  provider?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive'],
    description: 'Only active or only hidden.',
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  status?: 'active' | 'inactive';
}
