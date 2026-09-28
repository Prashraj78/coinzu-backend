import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  cz_user_id: string;

  @ApiProperty({ example: 'ada@example.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true, example: '+919875643266' })
  phone: string | null;

  @ApiProperty({ type: String, nullable: true })
  google_id: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Ada Lovelace' })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'female' })
  gender: string | null;

  @ApiProperty({ type: String, nullable: true, enum: ['18-24', '25-34', '35-44', '45-54+'] })
  age_range: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'GB' })
  country: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ type: [String], example: ['action', 'puzzle'] })
  interests: string[];

  @ApiProperty({ type: String, nullable: true })
  primary_goal: string | null;

  @ApiProperty({ example: 'ADA2026' })
  referral_code: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  referred_by: string | null;

  @ApiProperty({ enum: ['silver', 'gold', 'platinum', 'diamond'] })
  tier: string;

  @ApiProperty({ enum: ['none', 'pending', 'verified', 'rejected', 'manual_review'] })
  kyc_status: string;

  @ApiProperty({ example: 71 })
  profile_completion_pct: number;

  @ApiProperty({ enum: ['user', 'admin'] })
  role: string;

  @ApiProperty({ enum: ['active', 'suspended', 'banned', 'deleted'] })
  status: string;

  @ApiProperty()
  onboarding_completed: boolean;

  @ApiProperty()
  notifications_enabled: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  email_verified_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  phone_verified_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  last_login_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}

export class DeletedAccountDto {
  @ApiProperty({ format: 'uuid' })
  cz_user_id: string;

  @ApiProperty({ example: 'ada@example.com' })
  email: string;
}
