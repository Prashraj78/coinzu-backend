import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/** What Telegram Login hands the web page when a signed-in user connects their Telegram. */
export class TelegramLinkDto {
  @ApiProperty({ description: 'The OIDC id_token (JWT) from Telegram.Login.auth.' })
  @IsString()
  id_token: string;

  @ApiPropertyOptional({ description: 'The nonce the page passed to Telegram.Login.auth; must match the token.' })
  @IsOptional()
  @IsString()
  @Length(8, 128)
  nonce?: string;
}
