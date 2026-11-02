import { ApiProperty } from '@nestjs/swagger';

export class CoinzuMilestoneResponseDto {
  @ApiProperty({ example: 'ms_01' })
  milestone_id: string;

  @ApiProperty({ example: 'Reach level 5' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ example: 1 })
  sort_order: number;

  @ApiProperty({ example: 2500 })
  coins: number;

  @ApiProperty({ example: 0 })
  gems: number;

  @ApiProperty({ type: Number, nullable: true, example: 7 })
  deadline_days: number | null;

  @ApiProperty({ example: false })
  is_bonus: boolean;
}

export class CoinzuOfferResponseDto {
  @ApiProperty({ example: 'ofr_123' })
  offer_id: string;

  @ApiProperty({ example: 'Coin Quest' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  short_description: string | null;

  @ApiProperty({ type: String, nullable: true })
  image_url: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon_url: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'games' })
  category: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'easy' })
  difficulty: string | null;

  @ApiProperty({ type: [String], example: ['US', 'IN'] })
  countries: string[];

  @ApiProperty({ example: false })
  is_worldwide: boolean;

  @ApiProperty({ example: true })
  has_milestones: boolean;

  @ApiProperty({ type: [CoinzuMilestoneResponseDto] })
  milestones: CoinzuMilestoneResponseDto[];

  @ApiProperty({ example: 5000 })
  total_coins: number;

  @ApiProperty({ example: 0 })
  total_gems: number;

  @ApiProperty({ example: 'https://api.rewardtym.online/v3/r?lt_campaign_id=...' })
  redirect_url: string;

  @ApiProperty({ type: String, nullable: true, example: 'Start' })
  cta_label: string | null;

  @ApiProperty({ type: String, nullable: true, example: '~10 min' })
  est_time_label: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.5 })
  rating: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1200 })
  completed_count: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'trending' })
  section_key: string | null;
}

export class CoinzuOfferProgressDto {
  @ApiProperty({ example: 2 })
  completed: number;

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ type: [String], example: ['ms_01', 'ms_02'] })
  done_milestone_ids: string[];
}

export class CoinzuInProgressOfferResponseDto extends CoinzuOfferResponseDto {
  @ApiProperty({ type: CoinzuOfferProgressDto })
  progress: CoinzuOfferProgressDto;
}

export class CoinzuHomeSectionResponseDto {
  @ApiProperty({ example: 'trending' })
  key: string;

  @ApiProperty({ example: 'Trending Offers' })
  title: string;

  @ApiProperty({ type: [CoinzuOfferResponseDto] })
  offers: CoinzuOfferResponseDto[];
}

export class CoinzuHomeResponseDto {
  @ApiProperty({ type: [CoinzuHomeSectionResponseDto] })
  sections: CoinzuHomeSectionResponseDto[];
}

export class CoinzuSectionPageResponseDto {
  @ApiProperty({ example: 'recommended' })
  key: string;

  @ApiProperty({ example: 'Recommended Offers' })
  title: string;

  @ApiProperty({ type: [CoinzuOfferResponseDto] })
  data: CoinzuOfferResponseDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: true, description: 'More pages exist after this one.' })
  has_more: boolean;
}

export class CoinzuRedirectResponseDto {
  @ApiProperty({ example: 'ofr_123' })
  offer_id: string;

  @ApiProperty({ example: 'https://api.rewardtym.online/v3/r?lt_campaign_id=...&partner_user_id=...' })
  redirect_url: string;
}
