import { ApiProperty } from '@nestjs/swagger';

export class AvatarDto {
  @ApiProperty({ format: 'uuid' })
  cz_avatar_id: string;

  @ApiProperty({ example: 'Aria' })
  label: string;

  @ApiProperty({ example: 'https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/aria.png' })
  image_url: string;

  @ApiProperty({ example: 1 })
  display_order: number;
}

export class AdminAvatarDto extends AvatarDto {
  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class AvatarImageDto {
  @ApiProperty({ example: 'https://pub-3d84c195d8854a1aaf0f51c634bfa899.r2.dev/avatar-library/5f1c.png' })
  url: string;
}

export class AvatarDeletedDto {
  @ApiProperty({ example: true })
  deleted: boolean;
}
