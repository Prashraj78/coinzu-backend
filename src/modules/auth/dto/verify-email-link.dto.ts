import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { LINK_TOKEN_PATTERN } from '../link-token.service';

export class VerifyEmailLinkDto {
  @ApiProperty({ example: 'a1b2c3...', description: '64-character hex token from the confirm-email link.' })
  @IsString()
  @Matches(LINK_TOKEN_PATTERN)
  token: string;
}
