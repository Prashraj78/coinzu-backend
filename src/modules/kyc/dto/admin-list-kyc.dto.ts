import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import type { KycStatus } from '../../../database/entities/kyc-verification.entity';

const STATUSES = ['pending', 'verified', 'rejected', 'manual_review'] as const;

export class AdminListKycDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'shubham' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: KycStatus;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Submitted on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Submitted on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;
}
