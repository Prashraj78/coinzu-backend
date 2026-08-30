import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One master row per selectable option (gender, interest, and any future
 * dropdown), grouped by `type`. The app reads only active rows; the type
 * vocabulary itself is not fixed in code so a new category needs no release.
 */
@Entity({ name: 'dropdown_options' })
@Index(['type', 'value'], { unique: true })
export class DropdownOption {
  @PrimaryGeneratedColumn('uuid')
  cz_dropdown_option_id: string;

  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 60 })
  value: string;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon_url: string | null;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
