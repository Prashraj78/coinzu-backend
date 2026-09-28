import { ApiProperty } from '@nestjs/swagger';

export class AchievementDto {
  @ApiProperty({ format: 'uuid' })
  cz_achievement_id: string;

  @ApiProperty({ type: String, nullable: true, example: 'first-blood' })
  slug: string | null;

  @ApiProperty({ example: 'First Blood' })
  title: string;

  @ApiProperty({ type: String, nullable: true, example: '🔥' })
  emoji: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Complete your first offer.' })
  description: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  icon_url: string | null;

  @ApiProperty({ enum: ['common', 'rare', 'epic', 'rarest'] })
  rarity: 'common' | 'rare' | 'epic' | 'rarest';

  @ApiProperty({ example: 25 })
  points: number;

  @ApiProperty({ example: 'complete_offer' })
  criteria_type: string;

  @ApiProperty({ example: 1 })
  target: number;

  @ApiProperty({ example: 0 })
  progress: number;

  @ApiProperty({ example: 0 })
  progress_pct: number;

  @ApiProperty({ example: '0/1' })
  progress_label: string;

  @ApiProperty({ example: false })
  is_unlocked: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  unlocked_at: Date | null;

  @ApiProperty({ example: 1 })
  display_order: number;
}

export class AchievementEarnedDto {
  @ApiProperty({ example: 19265 })
  coins: number;

  @ApiProperty({ example: 15610 })
  gems: number;
}

export class AchievementProgressDto {
  @ApiProperty({ example: 3 })
  unlocked: number;

  @ApiProperty({ example: 24 })
  total: number;

  @ApiProperty({ example: '3/24' })
  label: string;

  @ApiProperty({ example: 13 })
  percent: number;

  @ApiProperty({ example: 230 })
  points: number;

  @ApiProperty({ example: 4315 })
  points_available: number;
}

export class AchievementBoardDto {
  @ApiProperty({ type: AchievementEarnedDto })
  earned: AchievementEarnedDto;

  @ApiProperty({ type: AchievementProgressDto })
  progress: AchievementProgressDto;

  @ApiProperty({ type: AchievementDto, nullable: true })
  current_medal: AchievementDto | null;

  @ApiProperty({ type: AchievementDto, nullable: true })
  rarest_medal: AchievementDto | null;

  @ApiProperty({ type: [AchievementDto] })
  data: AchievementDto[];

  @ApiProperty({ example: 24 })
  total: number;
}
