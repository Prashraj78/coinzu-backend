import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class SetAvatarDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'An active avatar from GET /api/avatars. Send this or use_google.' })
  @IsOptional()
  @IsUUID()
  cz_avatar_id?: string;

  @ApiPropertyOptional({ example: true, description: 'Switch back to the Google profile photo. Send this or cz_avatar_id.' })
  @IsOptional()
  @IsBoolean()
  use_google?: boolean;
}
