import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ description: 'Category this FAQ belongs to.' })
  @IsUUID()
  category_id: string;

  @ApiProperty({ example: 'How can I withdraw my earnings?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  question: string;

  @ApiProperty({ example: 'Go to Wallet and tap Withdraw.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  answer: string;

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
