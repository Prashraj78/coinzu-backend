import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class AdminListReferralsDto extends ListQueryDto {
  @ApiPropertyOptional({
    example: 'shubham@coinzu.app',
    description: 'Case-insensitive match against email, name, or referral code.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Joined on/after this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'Joined on/before this UTC date (inclusive), yyyy-MM-dd.',
  })
  @IsOptional()
  @IsDateString()
  date_end?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'true keeps only users who invited at least one friend, false keeps only users who invited nobody. Omit to list everyone.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  has_referrals?: boolean;
}
