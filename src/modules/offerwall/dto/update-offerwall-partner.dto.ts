import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateOfferwallPartnerDto {
  @ApiPropertyOptional({ example: 'AdGate Media' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'adgate-media' })
  @IsOptional()
  @Matches(/^[a-z0-9-]{2,60}$/, {
    message: 'slug must be lowercase letters, numbers and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  click_url_template?: string;

  @ApiPropertyOptional({ enum: ['get', 'post'] })
  @IsOptional()
  @IsIn(['get', 'post'])
  postback_method?: 'get' | 'post';

  @ApiPropertyOptional({ enum: ['token', 'hmac_sha256'] })
  @IsOptional()
  @IsIn(['token', 'hmac_sha256'])
  postback_auth_type?: 'token' | 'hmac_sha256';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  postback_secret?: string;

  @ApiPropertyOptional({ type: OfferwallFieldMappingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OfferwallFieldMappingDto)
  postback_field_mapping?: OfferwallFieldMappingDto;

  @ApiPropertyOptional({ example: 1 })
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

  @ApiPropertyOptional({ example: 10 })
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
