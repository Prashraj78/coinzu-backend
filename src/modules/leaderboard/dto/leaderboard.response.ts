import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardRowDto {
  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ format: 'uuid' })
  cz_user_id: string;

  @ApiProperty({ type: String, nullable: true, example: 'Ada Lovelace' })
  name: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  avatar_url: string | null;

  @ApiProperty({ example: 184300 })
  total_coins: number;
}

export class MyRankDto {
  @ApiProperty({ type: Number, nullable: true, example: 128 })
  rank: number | null;

  @ApiProperty({ example: 9450 })
  total_coins: number;

  @ApiProperty({ enum: ['today', 'week', 'all_time'] })
  window: 'today' | 'week' | 'all_time';
}
