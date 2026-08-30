import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PreviewAudienceDto } from './preview-audience.dto';
import { PushMessageDto } from './push-message.dto';

/** Who it goes to, what it says, and when. */
export class CreatePushDto extends IntersectionType(
  PreviewAudienceDto,
  PushMessageDto,
) {
  @ApiPropertyOptional({
    example: true,
    description:
      'Default true. Pass false to save a draft, or set scheduled_at to queue it.',
  })
  @IsOptional()
  @IsBoolean()
  send_now?: boolean;

  @ApiPropertyOptional({
    example: '2026-09-01T09:00:00.000Z',
    description:
      'UTC send time. Must be in the future. Takes precedence over send_now.',
  })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ description: 'Template this was composed from.' })
  @IsOptional()
  @IsUUID('4')
  cz_push_template_id?: string;
}
