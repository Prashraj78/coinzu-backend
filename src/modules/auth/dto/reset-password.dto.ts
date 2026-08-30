import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { LINK_TOKEN_PATTERN } from '../link-token.service';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3...', description: '64-character hex token from the reset-password email link.' })
  @IsString()
  @Matches(LINK_TOKEN_PATTERN)
  token: string;

  @ApiProperty({ example: 'N3wS3curePassw0rd', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
