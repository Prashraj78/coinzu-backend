import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminToggleProductDto {
  @ApiProperty({ description: 'Whether the product is shown in the store.' })
  @IsBoolean()
  is_active: boolean;
}
