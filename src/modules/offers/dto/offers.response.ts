import { ApiProperty } from '@nestjs/swagger';

export class OfferGoalDto {
  @ApiProperty({ example: 'g1' })
  goal_id: string;

  @ApiProperty({ example: 'Install the app' })
  title: string;

  @ApiProperty({ example: 500 })
  reward_coins: number;
}

export class OfferDto {
  @ApiProperty({ format: 'uuid' })
  cz_offer_id: string;

  @ApiProperty({ format: 'uuid' })
  provider_id: string;

  @ApiProperty({ example: 'RT-99120' })
  external_offer_id: string;

  @ApiProperty({ example: 'Reach level 10 in Coin Quest' })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  image_url: string | null;

  @ApiProperty({ example: 2500 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ type: String, nullable: true, example: 'games' })
  category: string | null;

  @ApiProperty({ type: [String], example: ['US'] })
  countries: string[];

  @ApiProperty({ type: [String], example: ['android'] })
  platforms: string[];

  @ApiProperty({ type: [OfferGoalDto] })
  goals: OfferGoalDto[];

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expires_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  synced_at: Date | null;
}

export class MyOfferDto {
  @ApiProperty({ format: 'uuid' })
  cz_offer_click_id: string;

  @ApiProperty({ type: String, format: 'date-time' })
  clicked_at: Date;

  @ApiProperty({ type: OfferDto, nullable: true })
  offer: OfferDto | null;

  @ApiProperty({ enum: ['in_progress', 'pending', 'approved', 'reversed'] })
  status: string;

  @ApiProperty({ example: 0 })
  payout_coins: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  credited_at: Date | null;
}

export class OfferClickDto {
  @ApiProperty({ example: 'cz_9f2c8a11c4d7b3e5' })
  click_id: string;

  @ApiProperty({ example: 'https://track.rewardtym.com/click?offer=RT-99120' })
  tracking_url: string;
}
