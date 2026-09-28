import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class UpdateAvatarDto {
  @ApiPropertyOptional({ example: 'Aria' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiPropertyOptional({ example: 'https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/aria.png' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  image_url?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @ApiPropertyOptional({ example: false, description: 'Hidden from the picker. Users already wearing it keep it.' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
