import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { RegisterDeviceDto } from '../../users/dto/register-device.dto';

export class GoogleLoginDto {
  @ApiProperty({ description: 'The ID token returned by Google Sign-In.' })
  @IsString()
  id_token: string;

  @ApiPropertyOptional({ example: 'K7M2PQ4X' })
  @IsOptional()
  @IsString()
  @Length(6, 12)
  referral_code?: string;

  @ApiPropertyOptional({
    type: RegisterDeviceDto,
    description:
      'Device/fraud signals. Send on first sign-in so a device already tied to another account is refused before the account is created; may also be sent later via POST /api/users/me/device.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterDeviceDto)
  device?: RegisterDeviceDto;
}
