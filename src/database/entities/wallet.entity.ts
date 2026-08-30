import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wallets' })
export class Wallet {
  @PrimaryColumn({ type: 'uuid' })
  cz_user_id: string;

  @Column({ type: 'int', default: 0 })
  coin_balance: number;

  @Column({ type: 'int', default: 0 })
  gem_balance: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
