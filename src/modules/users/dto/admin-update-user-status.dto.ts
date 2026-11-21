import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AdminUpdateUserStatusDto {
  @ApiProperty({
    enum: ['active', 'suspended', 'banned'],
    example: 'suspended',
    description: '`suspended`/`banned` block sign-in and every request at once; `active` restores the account.',
  })
  @IsIn(['active', 'suspended', 'banned'])
  status: 'active' | 'suspended' | 'banned';
}
