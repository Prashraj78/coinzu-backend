import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'faq_categories' })
export class FaqCategory {
  @PrimaryGeneratedColumn('uuid')
  cz_faq_category_id: string;

  /** Stable key the app sends as `?category=`. Never renamed once published. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
