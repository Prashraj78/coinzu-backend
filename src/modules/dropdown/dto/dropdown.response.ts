import { ApiProperty } from '@nestjs/swagger';

export class DropdownOptionDto {
  @ApiProperty({ example: 'male' })
  value: string;

  @ApiProperty({ example: 'Male' })
  label: string;

  @ApiProperty({ type: String, nullable: true, example: null })
  icon_url: string | null;
}
