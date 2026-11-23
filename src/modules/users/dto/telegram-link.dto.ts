import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length, ValidateIf } from 'class-validator';

/** What Telegram Login hands the web page when a signed-in user connects their Telegram. */
export class TelegramLinkDto {
  @ApiPropertyOptional({ description: 'Popup login: the OIDC id_token (JWT) from Telegram.Login.auth. Send this or `code`.' })
  @ValidateIf((o) => !o.code)
  @IsString()
  id_token?: string;
  @ApiPropertyOptional({ description: 'Same-tab (phone) login: the authorization code Telegram returned to the redirect URI.' })
  @ValidateIf((o) => !o.id_token)
  @IsString()
  @Length(8, 512)
  code?: string;

  @ApiPropertyOptional({ description: 'PKCE code_verifier for `code` (43 to 128 characters).' })
  @ValidateIf((o) => !!o.code)
  @IsString()
  @Length(43, 128)
  code_verifier?: string;

  @ApiPropertyOptional({ example: 'https://app.coinzu.online/telegram-callback.html', description: 'The redirect_uri the code was issued for; must match exactly.' })
  @ValidateIf((o) => !!o.code)
  @IsUrl({ require_tld: false, protocols: ['https', 'http'] })
  redirect_uri?: string;


  @ApiPropertyOptional({ description: 'The nonce the page passed to Telegram.Login.auth; must match the token.' })
  @IsOptional()
  @IsString()
  @Length(8, 128)
  nonce?: string;
}
