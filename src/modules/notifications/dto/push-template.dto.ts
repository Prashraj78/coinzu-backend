import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { PUSH_CATEGORIES, PushButtonDto } from './push-message.dto';

export class CreatePushTemplateDto {
  @ApiProperty({ example: 'Weekend double coins', description: 'Admin-facing name.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: '🎉' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @ApiProperty({ example: 'Double coins all weekend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Every offer you finish before Sunday pays twice.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/push/weekend.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @ApiPropertyOptional({ example: 'coinzu://offers' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deep_link?: string;

  @ApiPropertyOptional({ enum: PUSH_CATEGORIES, default: 'announcement' })
  @IsOptional()
  @IsIn(PUSH_CATEGORIES)
  category?: (typeof PUSH_CATEGORIES)[number];

  @ApiPropertyOptional({ type: [PushButtonDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PushButtonDto)
  buttons?: PushButtonDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdatePushTemplateDto extends PartialType(CreatePushTemplateDto) {}

export class ListPushTemplatesDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'weekend' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: PUSH_CATEGORIES })
  @IsOptional()
  @IsIn(PUSH_CATEGORIES)
  category?: (typeof PUSH_CATEGORIES)[number];

  @ApiPropertyOptional({ description: 'Only active templates when true.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;
}
