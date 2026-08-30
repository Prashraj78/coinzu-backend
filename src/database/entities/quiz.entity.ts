import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'quizzes' })
@Index(['date'])
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  cz_quiz_id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'jsonb' })
  options: string[];

  // Never sent to the app; only compared server-side.
  @Column({ type: 'varchar', length: 255, select: false })
  correct_option: string;

  /** Shown above the question. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
