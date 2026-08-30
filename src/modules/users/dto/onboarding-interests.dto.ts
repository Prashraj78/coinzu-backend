import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

/** Account setup step 3 — interest picker. */
export class OnboardingInterestsDto {
  @ApiProperty({ example: ['gaming', 'shopping', 'travel'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  interests: string[];
}
