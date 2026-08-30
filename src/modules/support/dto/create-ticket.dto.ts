import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { TicketType } from '../../../database/entities/support-ticket.entity';

export class CreateTicketDto {
  @ApiProperty({
    enum: ['email_support', 'report_problem', 'feedback'],
    example: 'report_problem',
  })
  @IsIn(['email_support', 'report_problem', 'feedback'])
  type: TicketType;

  @ApiPropertyOptional({
    example: 'Withdrawals',
    description: 'Free text. The app picks it from a list it hard-codes, so options change without a release.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({
    example: 'Coins not credited',
    description: 'Free text, same as category. The app hard-codes the options.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  issue_type?: string;

  @ApiPropertyOptional({
    example: '2026-08-28T14:30:00.000Z',
    description: 'When the problem happened, from the "When did the issue happen?" picker.',
  })
  @IsOptional()
  @IsDateString()
  occurred_at?: string;

  @ApiPropertyOptional({
    example: 'Offers page',
    description: 'Where in the app it happened. Optional on the form.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  affected_area?: string;

  @ApiPropertyOptional({ example: 'Coins missing after offer' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiProperty({ example: 'I completed the offer yesterday but got no coins.' })
  @IsString()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({ example: 4, description: 'Only used for feedback.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: ['https://cdn.coinzu.app/support/a.png'] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachment_urls?: string[];
}
