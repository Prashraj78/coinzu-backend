import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'referral_tier_configs' })
export class ReferralTierConfig {
  @PrimaryGeneratedColumn('uuid')
  cz_referral_tier_config_id: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  invites_required: number;

  @Column({ type: 'varchar', length: 60 })
  reward_type: string;

  @Column({ type: 'varchar', length: 120 })
  reward_value: string;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
