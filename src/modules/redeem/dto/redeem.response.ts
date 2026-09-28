import { ApiProperty } from '@nestjs/swagger';

export class GiftCardProductDto {
  @ApiProperty({ format: 'uuid' })
  cz_gift_card_product_id: string;

  @ApiProperty()
  provider_name: string;

  @ApiProperty()
  external_product_id: string;

  @ApiProperty({ example: 'Steam' })
  brand: string;

  @ApiProperty({ example: '£200' })
  denomination: string;

  @ApiProperty({ example: 2000 })
  price_coins: number;

  @ApiProperty({ type: String, nullable: true, example: 'gaming' })
  category: string | null;

  @ApiProperty({ type: String, nullable: true })
  image_url: string | null;

  @ApiProperty()
  is_featured: boolean;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  synced_at: Date | null;
}

export class GiftCardOrderDto {
  @ApiProperty({ format: 'uuid' })
  cz_gift_card_order_id: string;

  @ApiProperty({ format: 'uuid' })
  user_id: string;

  @ApiProperty({ format: 'uuid' })
  product_id: string;

  @ApiProperty()
  price_coins: number;

  @ApiProperty({ enum: ['pending', 'fulfilled', 'failed'] })
  status: string;

  @ApiProperty({ type: String, nullable: true })
  provider_order_id: string | null;

  @ApiProperty({ type: String, nullable: true })
  failure_reason: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fulfilled_at: Date | null;

  @ApiProperty({ type: String, nullable: true })
  brand: string | null;

  @ApiProperty({ type: String, nullable: true })
  denomination: string | null;

  @ApiProperty({ type: String, nullable: true })
  image_url: string | null;
}

export class GiftCardCodeDto {
  @ApiProperty({ format: 'uuid' })
  cz_gift_card_order_id: string;

  @ApiProperty({ example: 'XXXX-XXXX-XXXX' })
  code: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fulfilled_at: Date | null;
}
