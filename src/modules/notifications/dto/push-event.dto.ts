import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const PUSH_EVENTS = ['delivered', 'opened', 'clicked'] as const;

/** What the app reports back after a notification lands or is tapped. */
export class ReportPushEventDto {
  @ApiProperty({ description: 'The campaign_id delivered in the FCM data payload.' })
  @IsUUID('4')
  cz_push_campaign_id: string;

  @ApiProperty({ enum: PUSH_EVENTS })
  @IsIn(PUSH_EVENTS)
  event: (typeof PUSH_EVENTS)[number];

  @ApiPropertyOptional({
    example: 'open_offers',
    description: 'Which action button was tapped, when the event is clicked.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  button_id?: string;
}
