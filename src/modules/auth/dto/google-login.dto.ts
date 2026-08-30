import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'The ID token returned by Google Sign-In.' })
  @IsString()
  id_token: string;

  @ApiPropertyOptional({ example: 'K7M2PQ4X' })
  @IsOptional()
  @IsString()
  @Length(6, 12)
  referral_code?: string;
}
