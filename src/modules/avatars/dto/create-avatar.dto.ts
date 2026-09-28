import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateAvatarDto {
  @ApiProperty({ example: 'Aria', description: 'Name shown under the avatar in the picker.' })
  @IsString()
  @MaxLength(60)
  label: string;

  @ApiProperty({ example: 'https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/aria.png', description: 'Upload the file with POST /api/admin/avatars/image first and send its url.' })
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  image_url: string;

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
