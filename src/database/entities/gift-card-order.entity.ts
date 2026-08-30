import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GiftCardProduct } from './gift-card-product.entity';

export type GiftCardOrderStatus = 'pending' | 'fulfilled' | 'failed';

@Entity({ name: 'gift_card_orders' })
@Index(['user_id', 'created_at'])
export class GiftCardOrder {
  @PrimaryGeneratedColumn('uuid')
  cz_gift_card_order_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'int' })
  price_coins: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  provider_order_id: string | null;

  // Encrypted at rest and never returned by list endpoints.
  @Column({ type: 'text', nullable: true, select: false })
  redeemed_code_encrypted: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: GiftCardOrderStatus;

  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fulfilled_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  // Read-only relation — no FK constraint is created.
  @ManyToOne(() => GiftCardProduct, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'product_id' })
  product: GiftCardProduct | null;
}
