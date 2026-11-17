import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';
import type { ContactPlatform } from '../../../database/entities/user.entity';

export const CONTACT_PLATFORMS = ['telegram', 'whatsapp', 'skype', 'discord'] as const;

/** Web account setup: which app to reach the user on, and their handle or number there. */
export class OnboardingContactsDto {
  @ApiProperty({ example: 'whatsapp', enum: CONTACT_PLATFORMS })
  @IsIn(CONTACT_PLATFORMS)
  contact_platform: ContactPlatform;

  @ApiProperty({ example: '+919875643266', description: 'Username, ID or number on that app.' })
  @IsString()
  @Length(1, 100)
  contact_value: string;
}
