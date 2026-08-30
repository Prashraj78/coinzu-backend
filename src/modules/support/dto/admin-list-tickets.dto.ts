import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import type {
  TicketStatus,
  TicketType,
} from '../../../database/entities/support-ticket.entity';

const TYPES = ['email_support', 'report_problem', 'feedback'] as const;
const STATUSES = ['open', 'in_progress', 'resolved'] as const;

export class AdminListTicketsDto extends ListQueryDto {
  @ApiPropertyOptional({
    example: 'coins',
    description: "Matches the user's email or name, the subject, or the description.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: TYPES })
  @IsOptional()
  @IsIn(TYPES)
  type?: TicketType;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ example: 'Withdrawals' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ example: 'Coins not credited' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  issue_type?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Exact star rating. Only feedback rows carry one.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Only this user’s reports.' })
  @IsOptional()
  @IsUUID()
  cz_user_id?: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Reported on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Reported on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;
}
