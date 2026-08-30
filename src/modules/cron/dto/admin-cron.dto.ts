import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetCronEnabledDto {
  @ApiProperty({ example: false, description: 'False pauses the job.' })
  @IsBoolean()
  enabled: boolean;
}

export class SetCronScheduleDto {
  @ApiProperty({
    example: '0 */4 * * *',
    description: 'A standard 5- or 6-field cron expression, evaluated in UTC.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  cron: string;
}
