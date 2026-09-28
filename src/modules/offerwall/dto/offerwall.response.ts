import { ApiProperty } from '@nestjs/swagger';

export class OfferwallDto {
  @ApiProperty({ format: 'uuid' })
  cz_offerwall_partner_id: string;

  @ApiProperty({ example: 'Torox' })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  logo_url: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Trending' })
  badge_label: string | null;

  @ApiProperty({ example: 10 })
  rank: number;

  @ApiProperty({ example: 'https://partner.example/wall?uid=6d3a91f2' })
  offer_url: string;
}
