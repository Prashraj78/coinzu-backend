import { ApiProperty } from '@nestjs/swagger';

export class ReferralStepDto {
  @ApiProperty({ example: 1 })
  step: number;

  @ApiProperty({ format: 'uuid' })
  cz_referral_rule_id: string;

  @ApiProperty({ example: 'signup' })
  trigger: string;

  @ApiProperty({ example: 'Friend signs up' })
  label: string;

  @ApiProperty({ example: 'Pays the moment an invited friend creates their account with the code.' })
  description: string;

  @ApiProperty({ type: Number, nullable: true, example: null })
  threshold: number | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  threshold_unit: string | null;

  @ApiProperty({ example: 50 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;
}

export class ReferralCapDto {
  @ApiProperty({ example: 3000 })
  coins: number;

  @ApiProperty({ example: 1800 })
  gems: number;

  @ApiProperty({ example: true })
  is_capped: boolean;
}

export class ReferralStatsDto {
  @ApiProperty({ example: 12 })
  friends_invited: number;

  @ApiProperty({ example: 5 })
  friends_qualified: number;

  @ApiProperty({ example: 2400 })
  coins_earned: number;

  @ApiProperty({ example: 300 })
  gems_earned: number;
}

export class ReferredFriendDto {
  @ApiProperty({ format: 'uuid' })
  cz_referral_id: string;

  @ApiProperty({ type: String, nullable: true, example: 'Asha' })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  avatar_url: string | null;

  @ApiProperty({ enum: ['pending', 'qualified'] })
  status: 'pending' | 'qualified';

  @ApiProperty({ example: 325 })
  reward_coins: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  qualified_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  joined_at: Date;
}

export class ReferralInviteDto {
  @ApiProperty({ type: String, nullable: true, example: 'AJSLE5XD' })
  referral_code: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'https://app.coinzu.app/ref/AJSLE5XD' })
  referral_link: string | null;

  @ApiProperty({ type: [ReferralStepDto] })
  reward_steps: ReferralStepDto[];

  @ApiProperty({ type: ReferralCapDto })
  max_per_friend: ReferralCapDto;

  @ApiProperty({ type: ReferralStatsDto })
  stats: ReferralStatsDto;

  @ApiProperty({ type: [ReferredFriendDto] })
  friends: ReferredFriendDto[];
}
