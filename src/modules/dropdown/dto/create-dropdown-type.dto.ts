import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDropdownTypeDto {
  @ApiProperty({
    example: 'payout_reason',
    description:
      'Immutable key the app sends and reads. Lowercase letters, digits and underscores only.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[a-z][a-z0-9_]*$/)
  type: string;

  @ApiProperty({ example: 'Payout reason' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @ApiPropertyOptional({ example: 'Shown when a withdrawal is rejected.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
