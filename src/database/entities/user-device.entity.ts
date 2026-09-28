import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DevicePlatformType = 'ios' | 'android' | 'web';

/** One row per app install. Upserted on `cz_user_id` + `device_id`. */
@Entity({ name: 'user_devices' })
@Index(['cz_user_id', 'device_id'], { unique: true })
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  cz_device_id: string;

  @Index()
  @Column({ type: 'uuid' })
  cz_user_id: string;

  @Column({ type: 'varchar', length: 255 })
  device_id: string;

  @Column({ type: 'varchar', length: 10 })
  platform_type: DevicePlatformType;

  // sha256(user_agent|asn|platform_type|device_id) — a coarse fraud-matching signal, not a real fingerprint.
  @Column({ type: 'varchar', length: 64, nullable: true })
  fingerprint: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country_code: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  asn: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  isp: string | null;

  @Column({ type: 'boolean', default: false })
  is_vpn: boolean;

  // Reinstall-surviving device id: SSAID (Android) / IDFV (iOS) / null (web).
  // The key cross-account signal — many users on one hardware_id = one phone.
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  hardware_id: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  sim_country_code: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  carrier: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  mcc_mnc: string | null;

  // null = unknown (web / before native rebuild), not the same as an explicit false.
  @Column({ type: 'boolean', nullable: true })
  is_emulator: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  is_rooted: boolean | null;

  @Column({ type: 'int', nullable: true })
  risk_score: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  risk_flags: string[];

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  push_token: string | null;

  // Free-form, app-supplied: app_version, os_version, model, brand, locale, timezone, etc.
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  device_info: Record<string, unknown>;

  // Set once when the row is first created; never updated. Account-age signal.
  @Column({ type: 'timestamptz', nullable: true })
  first_seen_at: Date | null;

  @Column({ type: 'timestamptz' })
  last_seen_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
