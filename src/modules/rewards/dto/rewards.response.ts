import { ApiProperty } from '@nestjs/swagger';

export class RewardGameDto {
  @ApiProperty({ format: 'uuid' })
  cz_reward_game_id: string;

  @ApiProperty({ example: 'daily_lucky_draw' })
  slug: string;

  @ApiProperty({ enum: ['instant', 'draw'] })
  kind: string;

  @ApiProperty({ enum: ['none', 'daily', 'weekly'] })
  cadence: string;

  @ApiProperty({ example: 'Daily Lucky Draw' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon_url: string | null;

  @ApiProperty({ example: 5000 })
  headline_prize_coins: number;

  @ApiProperty({ example: 10 })
  entry_cost_gems: number;

  @ApiProperty({ enum: ['live', 'coming_soon', 'paused'] })
  status: string;

  @ApiProperty()
  is_playable: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  ends_at: Date | null;

  @ApiProperty({ type: Number, nullable: true, example: 86694 })
  seconds_remaining: number | null;

  @ApiProperty({ example: 0 })
  my_entries: number;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  cz_lucky_draw_id: string | null;

  @ApiProperty({ example: 1 })
  display_order: number;
}

export class RewardStepDto {
  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon_url: string | null;
}

export class RewardPrizeDto {
  @ApiProperty({ format: 'uuid' })
  cz_reward_prize_id: string;

  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: '1st Prize' })
  label: string;

  @ApiProperty({ example: 5000 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;
}

export class LuckyDrawDto {
  @ApiProperty({ format: 'uuid' })
  cz_lucky_draw_id: string;

  @ApiProperty({ example: '2026-09-28' })
  period_key: string;

  @ApiProperty({ type: String, format: 'date-time' })
  opens_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  draw_date: Date;

  @ApiProperty({ example: 3600 })
  seconds_remaining: number;

  @ApiProperty({ example: 12000 })
  prize_pool_coins: number;

  @ApiProperty({ example: 12364 })
  participants_count: number;

  @ApiProperty({ example: 40210 })
  entries_count: number;

  @ApiProperty({ example: 0 })
  my_entries: number;

  @ApiProperty({ example: 3.2 })
  average_entries: number;
}

export class RewardLastPlayDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  reward_coins: number;

  @ApiProperty()
  reward_gems: number;

  @ApiProperty({ type: String, format: 'date-time' })
  played_at: Date;
}

export class RewardWinnerDto {
  @ApiProperty({ format: 'uuid' })
  cz_lucky_draw_winner_id: string;

  @ApiProperty({ format: 'uuid' })
  cz_lucky_draw_id: string;

  @ApiProperty({ type: String, nullable: true })
  game_slug: string | null;

  @ApiProperty({ type: String, nullable: true })
  game_title: string | null;

  @ApiProperty({ type: String, nullable: true })
  period_key: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  draw_date: Date;

  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: 'prash@****.com' })
  masked_name: string;

  @ApiProperty({ type: String, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ type: String, nullable: true })
  country: string | null;

  @ApiProperty()
  prize_coins: number;

  @ApiProperty()
  prize_gems: number;

  @ApiProperty()
  entries_held: number;
}

export class RewardDetailDto {
  @ApiProperty({ format: 'uuid' })
  cz_reward_game_id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: ['instant', 'draw'] })
  kind: string;

  @ApiProperty({ enum: ['none', 'daily', 'weekly'] })
  cadence: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  subtitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon_url: string | null;

  @ApiProperty()
  headline_prize_coins: number;

  @ApiProperty()
  entry_cost_gems: number;

  @ApiProperty({ enum: ['live', 'coming_soon', 'paused'] })
  status: string;

  @ApiProperty()
  is_playable: boolean;

  @ApiProperty({ example: 1 })
  min_entries: number;

  @ApiProperty({ example: 250 })
  max_entries: number;

  @ApiProperty({ type: [Number], example: [5, 10, 25] })
  entry_packs: number[];

  @ApiProperty({ type: [RewardStepDto] })
  how_it_works: RewardStepDto[];

  @ApiProperty({ type: String, nullable: true })
  terms_url: string | null;

  @ApiProperty({ type: [RewardPrizeDto] })
  prizes: RewardPrizeDto[];

  @ApiProperty({ type: LuckyDrawDto, nullable: true })
  draw: LuckyDrawDto | null;

  @ApiProperty({ type: Number, nullable: true })
  my_plays_today: number | null;

  @ApiProperty({ type: RewardLastPlayDto, nullable: true })
  last_play: RewardLastPlayDto | null;

  @ApiProperty({ type: [RewardWinnerDto] })
  recent_winners: RewardWinnerDto[];
}

export class RewardEntriesDto {
  @ApiProperty({ format: 'uuid' })
  cz_lucky_draw_entry_id: string;

  @ApiProperty({ format: 'uuid' })
  cz_lucky_draw_id: string;

  @ApiProperty()
  entries_bought: number;

  @ApiProperty()
  gems_spent: number;

  @ApiProperty()
  my_entries: number;

  @ApiProperty()
  participants_count: number;

  @ApiProperty()
  entries_count: number;

  @ApiProperty({ type: String, format: 'date-time' })
  draw_date: Date;
}

export class RewardPlayDto {
  @ApiProperty({ format: 'uuid' })
  cz_reward_play_id: string;

  @ApiProperty({ format: 'uuid' })
  cz_reward_prize_id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  reward_coins: number;

  @ApiProperty()
  reward_gems: number;

  @ApiProperty()
  gems_spent: number;

  @ApiProperty({ type: String, format: 'date-time' })
  played_at: Date;
}
