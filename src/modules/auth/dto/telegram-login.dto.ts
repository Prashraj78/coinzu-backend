import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { RegisterDeviceDto } from '../../users/dto/register-device.dto';

/** What Telegram Login's callback hands the web page, plus our own fields. */
export class TelegramLoginDto {
  @ApiProperty({ description: 'The OIDC id_token (JWT) from Telegram.Login.auth.' })
  @IsString()
  id_token: string;

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
