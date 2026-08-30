import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'spin_wheel_configs' })
export class SpinWheelConfig {
  @PrimaryGeneratedColumn('uuid')
  cz_spin_wheel_config_id: string;

  @Column({ type: 'varchar', length: 60 })
  label: string;

  @Column({ type: 'int', default: 0 })
  reward_coins: number;

  @Column({ type: 'int', default: 0 })
  reward_gems: number;

  /** Relative weight, not a percentage — the service normalizes across rows. */
  @Column({ type: 'float', default: 1 })
  probability_weight: number;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
