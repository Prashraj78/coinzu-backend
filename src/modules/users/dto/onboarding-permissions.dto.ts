import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Account setup step 2 — notification permission. */
export class OnboardingPermissionsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  notifications_enabled: boolean;
}
