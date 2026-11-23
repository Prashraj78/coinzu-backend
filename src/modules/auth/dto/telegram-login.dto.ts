import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Length, ValidateIf, ValidateNested } from 'class-validator';
import { RegisterDeviceDto } from '../../users/dto/register-device.dto';

/** What Telegram Login's callback hands the web page, plus our own fields. */
export class TelegramLoginDto {
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

  @ApiPropertyOptional({ example: 'K7M2PQ4X' })
  @IsOptional()
  @IsString()
  @Length(6, 12)
  referral_code?: string;

  @ApiPropertyOptional({ type: RegisterDeviceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterDeviceDto)
  device?: RegisterDeviceDto;
}
