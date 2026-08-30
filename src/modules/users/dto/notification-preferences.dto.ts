import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Per-category push opt-outs. Send only what changed; anything left out keeps
 * its current value. `transaction` and `system` are not listed because they
 * cannot be muted.
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Master switch for push on this account.' })
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Product news and general announcements.' })
  @IsOptional()
  @IsBoolean()
  announcement?: boolean;

  @ApiPropertyOptional({ description: 'Offers, bonuses and campaigns.' })
  @IsOptional()
  @IsBoolean()
  promotion?: boolean;

  @ApiPropertyOptional({ description: 'Streaks, achievements and reward nudges.' })
  @IsOptional()
  @IsBoolean()
  reward?: boolean;

  @ApiPropertyOptional({
    description: 'Hold marketing back overnight. On by default.',
  })
  @IsOptional()
  @IsBoolean()
  quiet_hours?: boolean;
}
