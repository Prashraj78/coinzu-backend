import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AnswerQuizDto {
  @ApiProperty({ example: 'Bitcoin', description: 'Must be one of the quiz options.' })
  @IsString()
  @MaxLength(255)
  selected_option: string;
}
