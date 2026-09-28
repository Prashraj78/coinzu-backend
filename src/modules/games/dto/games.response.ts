import { ApiProperty } from '@nestjs/swagger';

export class WheelSegmentDto {
  @ApiProperty({ format: 'uuid' })
  cz_spin_wheel_config_id: string;

  @ApiProperty({ example: '1000' })
  label: string;

  @ApiProperty({ example: 1000 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ example: 1 })
  display_order: number;
}

export class WheelDto {
  @ApiProperty({ type: [WheelSegmentDto] })
  data: WheelSegmentDto[];

  @ApiProperty({ example: 8 })
  total: number;

  @ApiProperty({ example: 0 })
  spins_used: number;

  @ApiProperty({ example: 1 })
  spins_left: number;
}

export class SpinResultDto {
  @ApiProperty({ format: 'uuid' })
  cz_spin_history_id: string;

  @ApiProperty({ format: 'uuid' })
  cz_spin_wheel_config_id: string;

  @ApiProperty({ example: '1000' })
  label: string;

  @ApiProperty({ example: 1000 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ example: 0 })
  spins_left: number;
}

export class QuizAttemptDto {
  @ApiProperty({ format: 'uuid' })
  cz_quiz_attempt_id: string;

  @ApiProperty({ example: 'Paris' })
  selected_option: string;

  @ApiProperty()
  is_correct: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  attempted_at: Date;
}

export class QuizDto {
  @ApiProperty({ format: 'uuid' })
  cz_quiz_id: string;

  @ApiProperty({ example: '2026-09-28' })
  date: string;

  @ApiProperty({ example: 'What is the capital of France?' })
  question: string;

  @ApiProperty({ type: [String], example: ['Paris', 'Rome', 'Madrid'] })
  options: string[];

  @ApiProperty({ type: String, nullable: true })
  image_url: string | null;

  @ApiProperty()
  already_attempted: boolean;

  @ApiProperty({ type: QuizAttemptDto, nullable: true })
  my_attempt: QuizAttemptDto | null;
}

export class QuizAnswerResultDto {
  @ApiProperty({ format: 'uuid' })
  cz_quiz_attempt_id: string;

  @ApiProperty()
  is_correct: boolean;

  @ApiProperty({ example: 'Paris' })
  correct_option: string;

  @ApiProperty()
  scratch_card_granted: boolean;
}

export class ScratchStatusDto {
  @ApiProperty({ example: 0 })
  cards_used: number;

  @ApiProperty({ example: 1 })
  cards_left: number;

  @ApiProperty({ example: 1 })
  granted_cards: number;
}

export class ScratchResultDto {
  @ApiProperty({ format: 'uuid' })
  cz_scratch_history_id: string;

  @ApiProperty({ format: 'uuid' })
  cz_scratch_card_id: string;

  @ApiProperty({ example: '250 coins' })
  label: string;

  @ApiProperty({ example: 250 })
  reward_coins: number;

  @ApiProperty({ example: 0 })
  reward_gems: number;

  @ApiProperty({ example: 0 })
  cards_left: number;
}
