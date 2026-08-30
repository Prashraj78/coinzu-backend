import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * The catalogue of dropdown categories. A row here onboards a category (its
 * key, display label and blurb) before any option is added to it, so the admin
 * panel can list categories on their own and paginate the options inside one.
 */
@Entity({ name: 'dropdown_types' })
export class DropdownType {
  @PrimaryGeneratedColumn('uuid')
  cz_dropdown_type_id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
