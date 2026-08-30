import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OfferwallFieldMappingDto } from './offerwall-field-mapping.dto';

export class CreateOfferwallPartnerDto {
  @ApiProperty({ example: 'AdGate Media' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'adgate-media', description: 'URL-safe, unique. Used in the postback path.' })
  @IsString()
  @Matches(/^[a-z0-9-]{2,60}$/, {
    message: 'slug must be lowercase letters, numbers and hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'https://pub-xxx.r2.dev/offerwall-logos/adgate.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional({ example: 'General offers wall, strong on surveys.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'https://wall.adgatemedia.com/wall?userid={USER_ID}&app=coinzu',
    description: 'Opened in the app iframe. {USER_ID} is replaced with cz_user_id.',
  })
  @IsString()
  click_url_template: string;

  @ApiPropertyOptional({ example: 'get', enum: ['get', 'post'] })
  @IsOptional()
  @IsIn(['get', 'post'])
  postback_method?: 'get' | 'post';

  @ApiPropertyOptional({ example: 'token', enum: ['token', 'hmac_sha256'] })
  @IsOptional()
  @IsIn(['token', 'hmac_sha256'])
  postback_auth_type?: 'token' | 'hmac_sha256';

  @ApiPropertyOptional({
    description: 'Path token or HMAC key. Auto-generated when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  postback_secret?: string;

  @ApiProperty({ type: OfferwallFieldMappingDto })
  @ValidateNested()
  @Type(() => OfferwallFieldMappingDto)
  postback_field_mapping: OfferwallFieldMappingDto;

  @ApiPropertyOptional({ example: 1, description: 'Coins credited per 1 unit of the payout the partner sends.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  coins_per_payout_unit?: number;

  @ApiPropertyOptional({
    example: 50,
    description:
      'Percent of the payout field passed to the user, when the partner sends raw dollars with no rev-share applied. Omit when the payout field is already the final amount.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  revenue_share_percent?: number;

  @ApiPropertyOptional({ example: 10, description: 'Higher shows first in the app offerwall list.' })
  @IsOptional()
  @IsInt()
  rank?: number;

  @ApiPropertyOptional({ example: 'Trending' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  badge_label?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
