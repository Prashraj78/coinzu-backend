import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';
import type { UserAgeRange } from '../../../database/entities/user.entity';

/** Account setup step 1 — basic info. */
export class OnboardingInfoDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiProperty({ example: 'female' })
  @IsString()
  @Length(1, 20)
  gender: string;

  @ApiProperty({ example: '25-34', enum: ['18-24', '25-34', '35-44', '45-54+'] })
  @IsIn(['18-24', '25-34', '35-44', '45-54+'])
  age_range: UserAgeRange;

  @ApiProperty({ example: 'GB', description: 'ISO 3166-1 alpha-2.' })
  @IsString()
  @Length(2, 2)
  country: string;
}
