import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'offers' })
@Index(['provider_id', 'external_offer_id'], { unique: true })
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  cz_offer_id: string;

  @Column({ type: 'uuid' })
  provider_id: string;

  @Column({ type: 'varchar', length: 120 })
  external_offer_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  countries: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  platforms: string[];

  /** Milestone steps within one offer, when the provider sends several goals. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  goals: Array<{ goal_id: string; title: string; reward_coins: number }>;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  synced_at: Date | null;
}
