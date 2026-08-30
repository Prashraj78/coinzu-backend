import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertDropdownOptionDto {
  @ApiPropertyOptional({ example: 'interest', description: 'Group this option belongs to. Free-form, not a fixed enum.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @ApiPropertyOptional({ example: 'gaming', description: 'Stored value the client sends back.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  value?: string;

  @ApiPropertyOptional({ example: 'Gaming' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/dropdown/interest/gaming.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon_url?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
