import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RegisterDeviceDto } from '../../users/dto/register-device.dto';

export class RegisterDto {
  @ApiProperty({ example: 'user@coinzu.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePassw0rd', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ example: 'K7M2PQ4X', description: "A friend's code." })
  @IsOptional()
  @IsString()
  @Length(6, 12)
  referral_code?: string;

  @ApiPropertyOptional({
    type: RegisterDeviceDto,
    description: 'Captured for fraud checks and push notifications. Send it here, or later via POST /api/users/me/device.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegisterDeviceDto)
  device?: RegisterDeviceDto;
}
