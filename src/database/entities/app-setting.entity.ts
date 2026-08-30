import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'app_settings' })
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  setting_key: string;

  @Column({ type: 'text' })
  setting_value: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
