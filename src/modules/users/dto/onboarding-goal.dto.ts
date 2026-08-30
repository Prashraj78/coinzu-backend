import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** Account setup step 4 — the goal that finishes onboarding. */
export class OnboardingGoalDto {
  @ApiProperty({ example: 'earn_side_income' })
  @IsString()
  @Length(1, 60)
  primary_goal: string;
}
