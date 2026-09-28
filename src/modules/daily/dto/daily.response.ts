import { ApiProperty } from '@nestjs/swagger';

export class MasterChestDto {
  @ApiProperty({ example: 1000 })
  reward_coins: number;

  @ApiProperty({ example: 1000 })
  reward_gems: number;

  @ApiProperty({ example: 3 })
  completed: number;

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: '3/5' })
  progress_label: string;

  @ApiProperty({ example: 60 })
  percent: number;

  @ApiProperty()
  is_unlocked: boolean;

  @ApiProperty()
  is_claimed: boolean;

  @ApiProperty()
  can_claim: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  claimed_at: Date | null;
}

export class MaxEarningDto {
  @ApiProperty({ example: 3500 })
  coins: number;

  @ApiProperty({ example: 1500 })
  gems: number;
}

export class ChallengeAvailabilityDto {
  @ApiProperty()
  spin_available: boolean;

  @ApiProperty({ example: 1 })
  spins_left: number;

  @ApiProperty()
  quiz_available: boolean;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  quiz_id: string | null;

  @ApiProperty({ example: 0 })
  scratch_cards_left: number;

  @ApiProperty({ example: 0 })
  scratch_cards_pending: number;

  @ApiProperty()
  scratch_available: boolean;
}

export class ChallengeDayDto {
  @ApiProperty({ example: '2026-09-28' })
  date: string;

  @ApiProperty({ example: '28' })
  label: string;

  @ApiProperty({ example: 3 })
  completed: number;

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty()
  is_today: boolean;

  @ApiProperty()
  is_locked: boolean;

  @ApiProperty()
  is_viewable: boolean;
}

export class ChallengeTileDto {
  @ApiProperty({ format: 'uuid' })
  cz_daily_challenge_id: string;

  @ApiProperty({ enum: ['spin', 'quiz', 'game_install', 'invite', 'offer'] })
  type: string;

  @ApiProperty({ example: 'Spin the Lucky Wheel' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon_url: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['spin', 'quiz', 'scratch', 'offers', 'referrals', 'games'],
  })
  action: string | null;

  @ApiProperty()
  is_highlighted: boolean;

  @ApiProperty({ type: String, nullable: true, enum: ['scratch_card_ready'] })
  highlight_reason: string | null;

  @ApiProperty({ example: 0 })
  pending_scratch_cards: number;

  @ApiProperty({ example: 500 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ example: 2 })
  target: number;

  @ApiProperty({ example: 1 })
  progress: number;

  @ApiProperty({ example: '1/2' })
  progress_label: string;

  @ApiProperty()
  is_completed: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completed_at: Date | null;

  @ApiProperty()
  is_playable: boolean;

  @ApiProperty()
  has_pending_action: boolean;
}

export class ChallengeBoardDto {
  @ApiProperty({ example: '2026-09-28' })
  date: string;

  @ApiProperty()
  is_today: boolean;

  @ApiProperty()
  is_read_only: boolean;

  @ApiProperty({ example: 11 })
  streak_days: number;

  @ApiProperty({ type: MasterChestDto })
  master_chest: MasterChestDto;

  @ApiProperty({ type: MaxEarningDto })
  max_earning: MaxEarningDto;

  @ApiProperty({ type: ChallengeAvailabilityDto })
  availability: ChallengeAvailabilityDto;

  @ApiProperty({ type: [ChallengeDayDto] })
  calendar: ChallengeDayDto[];

  @ApiProperty({ type: [ChallengeTileDto] })
  data: ChallengeTileDto[];

  @ApiProperty({ example: 5 })
  total: number;
}

export class ChestClaimDto {
  @ApiProperty()
  claimed: boolean;

  @ApiProperty({ example: '2026-09-28' })
  date: string;

  @ApiProperty({ example: 1000 })
  reward_coins: number;

  @ApiProperty({ example: 1000 })
  reward_gems: number;

  @ApiProperty({ type: String, format: 'date-time' })
  claimed_at: Date;
}

export class StreakDayDto {
  @ApiProperty({ example: 1 })
  day_number: number;

  @ApiProperty({ example: 100 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ type: String, nullable: true, example: 'Week 1 bonus' })
  label: string | null;

  @ApiProperty()
  is_milestone: boolean;

  @ApiProperty()
  is_claimed: boolean;

  @ApiProperty()
  is_today: boolean;
}

export class StreakBoardDto {
  @ApiProperty({ example: 11 })
  current_day: number;

  @ApiProperty({ example: 14 })
  longest_day: number;

  @ApiProperty({ type: String, nullable: true, example: '2026-09-27' })
  last_claimed_date: string | null;

  @ApiProperty()
  can_claim_today: boolean;

  @ApiProperty({ type: Number, nullable: true, example: 12 })
  claimable_day: number | null;

  @ApiProperty({ example: 30 })
  cycle_days: number;

  @ApiProperty({ example: 5000 })
  total_coins: number;

  @ApiProperty({ example: 2000 })
  total_gems: number;

  @ApiProperty({ type: [StreakDayDto] })
  data: StreakDayDto[];

  @ApiProperty({ example: 30 })
  total: number;
}

export class StreakClaimDto {
  @ApiProperty({ example: 12 })
  day_number: number;

  @ApiProperty({ example: 100 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ type: String, nullable: true })
  label: string | null;

  @ApiProperty()
  is_milestone: boolean;

  @ApiProperty({ example: 12 })
  current_day: number;

  @ApiProperty({ example: 14 })
  longest_day: number;

  @ApiProperty({ example: 30 })
  cycle_days: number;

  @ApiProperty()
  cycle_completed: boolean;

  @ApiProperty({ example: '2026-09-28' })
  claimed_date: string;

  @ApiProperty({ example: 42 })
  total_checkins: number;
}
