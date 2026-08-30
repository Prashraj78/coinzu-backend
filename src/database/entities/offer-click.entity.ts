import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Offer } from './offer.entity';
import { OfferCompletion } from './offer-completion.entity';

@Entity({ name: 'offer_clicks' })
@Index(['user_id', 'clicked_at'])
export class OfferClick {
  @PrimaryGeneratedColumn('uuid')
  cz_offer_click_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  offer_id: string;

  @Column({ type: 'uuid' })
  provider_id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  click_id: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  clicked_at: Date;

  // Relations are for reads only — no FK constraint is created.
  @ManyToOne(() => Offer, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'offer_id' })
  offer: Offer | null;

  @OneToOne(() => OfferCompletion, (completion) => completion.click, {
    createForeignKeyConstraints: false,
  })
  completion: OfferCompletion | null;
}
