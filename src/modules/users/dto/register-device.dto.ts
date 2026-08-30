import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

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
