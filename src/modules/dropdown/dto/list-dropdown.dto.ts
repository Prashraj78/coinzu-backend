import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListDropdownDto {
  @ApiPropertyOptional({
    example: 'gender,interest',
    description: 'Comma-separated types to filter. Omit for every type.',
  })
  @IsOptional()
  @IsString()
  types?: string;
}
