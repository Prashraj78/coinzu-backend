import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'gift_card_products' })
@Index(['provider_name', 'external_product_id'], { unique: true })
export class GiftCardProduct {
  @PrimaryGeneratedColumn('uuid')
  cz_gift_card_product_id: string;

  @Column({ type: 'varchar', length: 60 })
  provider_name: string;

  @Column({ type: 'varchar', length: 120 })
  external_product_id: string;

  @Column({ type: 'varchar', length: 120 })
  brand: string;

  @Column({ type: 'varchar', length: 20 })
  denomination: string;

  @Column({ type: 'int' })
  price_coins: number;

  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  synced_at: Date | null;
}
