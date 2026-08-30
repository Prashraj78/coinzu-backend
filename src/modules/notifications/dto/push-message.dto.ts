import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const PUSH_CATEGORIES = [
  'announcement',
  'promotion',
  'reward',
  'transaction',
  'system',
] as const;

export const PUSH_PRIORITIES = ['high', 'normal'] as const;

export class PushButtonDto {
  @ApiProperty({ example: 'open_offers', description: 'Reported back as button_id.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  id: string;

  @ApiProperty({ example: 'Browse offers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  label: string;

  @ApiPropertyOptional({ example: 'coinzu://offers' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deep_link?: string;
}

/** The message half of a campaign — everything that reaches the device. */
export class PushMessageDto {
  @ApiPropertyOptional({ example: '🎉', description: 'Shown before the title.' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @ApiProperty({ example: 'Your coins are waiting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Finish one offer today and collect a bonus.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/push/banner.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;

  @ApiPropertyOptional({ example: 'coinzu://offers' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deep_link?: string;

  @ApiPropertyOptional({ type: [PushButtonDto], description: 'Up to 3 actions.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PushButtonDto)
  buttons?: PushButtonDto[];

  @ApiPropertyOptional({ enum: PUSH_PRIORITIES, default: 'high' })
  @IsOptional()
  @IsIn(PUSH_PRIORITIES)
  priority?: (typeof PUSH_PRIORITIES)[number];

  @ApiPropertyOptional({ example: 86400, description: 'Seconds FCM keeps retrying.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2419200)
  ttl_seconds?: number;

  @ApiPropertyOptional({ example: 'daily_bonus' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  collapse_key?: string;

  @ApiPropertyOptional({ example: 'rewards' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  android_channel_id?: string;

  @ApiPropertyOptional({ example: 'default' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sound?: string;

  @ApiPropertyOptional({ example: 1, description: 'iOS app-icon badge number.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  badge?: number;
}
