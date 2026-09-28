import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({
    example: 'b7e2b6b0-1a2b-4c3d-9e4f-5a6b7c8d9e0f',
    description: "The app's persistent per-install device id.",
  })
  @IsString()
  @Length(1, 255)
  device_id: string;

  @ApiPropertyOptional({
    example: 'android',
    enum: ['ios', 'android', 'web'],
    description: 'Falls back to User-Agent sniffing when omitted.',
  })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform_type?: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({
    example: 'fcm-or-apns-token',
    description: 'Push notification token. Send again whenever it rotates.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  push_token?: string;

  @ApiPropertyOptional({
    example: 'ff8a1c2d3e4f5a6b',
    description:
      'Reinstall-surviving device id (SSAID on Android, IDFV on iOS). Server links accounts sharing it. Fraud signal — server uses it, never returns it.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  hardware_id?: string;

  @ApiPropertyOptional({
    example: 'IN',
    description: 'SIM ISO 3166-1 alpha-2 country. Null on wifi-only / eSIM / web.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  sim_country_code?: string;

  @ApiPropertyOptional({ example: 'Airtel', description: 'SIM carrier name.' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  carrier?: string;

  @ApiPropertyOptional({
    example: '404-45',
    description: 'Mobile country code + network code, "MCC-MNC".',
  })
  @IsOptional()
  @IsString()
  @Length(1, 15)
  mcc_mnc?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'True when the app is running on an emulator, not real hardware.',
  })
  @IsOptional()
  @IsBoolean()
  is_emulator?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'True when the device appears rooted / jailbroken.',
  })
  @IsOptional()
  @IsBoolean()
  is_rooted?: boolean;

  @ApiPropertyOptional({
    example: {
      app_version: '1.4.2',
      os_version: '17.4',
      model: 'Pixel 8',
      brand: 'Google',
      locale: 'en-US',
      timezone: 'Asia/Kolkata',
    },
    description: 'Free-form device metadata. Any JSON object — add fields as the app needs them, no migration required.',
  })
  @IsOptional()
  @IsObject()
  device_info?: Record<string, unknown>;
}
