import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import type { UserAgeRange } from '../../../database/entities/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'female' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  gender?: string;

  @ApiPropertyOptional({ example: '25-34', enum: ['18-24', '25-34', '35-44', '45-54+'] })
  @IsOptional()
  @IsIn(['18-24', '25-34', '35-44', '45-54+'])
  age_range?: UserAgeRange;

  @ApiPropertyOptional({ example: 'GB', description: 'ISO 3166-1 alpha-2.' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/avatars/a.png' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  avatar_url?: string;

  @ApiPropertyOptional({ example: ['gaming', 'shopping'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  interests?: string[];

  @ApiPropertyOptional({
    example: '+919875643266',
    description: 'E.164 format, digits with an optional leading +.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid phone number, e.g. +919875643266',
  })
  phone?: string;
}
