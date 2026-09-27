import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AdminDeleteUserDto {
  @ApiProperty({
    example: 'someone@example.com',
    description:
      'Email of the Coinzu account to hard-delete. Case-insensitive. Irreversible.',
  })
  @IsEmail()
  email!: string;
}
