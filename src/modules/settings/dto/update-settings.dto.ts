import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UpdateSettingItemDto {
  @ApiProperty({ example: 'coins_per_gem' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  setting_key: string;

  @ApiProperty({
    example: '0.025',
    description:
      'Always a string. The catalogue decides how it is parsed — "12", "0.025" or "true".',
  })
  @IsString()
  @MaxLength(255)
  setting_value: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [UpdateSettingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingItemDto)
  settings: UpdateSettingItemDto[];
}
