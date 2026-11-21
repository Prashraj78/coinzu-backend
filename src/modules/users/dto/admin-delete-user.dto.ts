import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, Matches, ValidateIf } from 'class-validator';

/** Identify the account by `email` or by `telegram_id` (one is required; `telegram_id` wins when both are sent). */
export class AdminDeleteUserDto {
  @ApiPropertyOptional({
    example: 'someone@example.com',
    description: 'Email of the Coinzu account to hard-delete. Case-insensitive. Irreversible.',
  })
  @ValidateIf((o: AdminDeleteUserDto) => o.telegram_id === undefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '723723667',
    description: 'Numeric Telegram user id of a Telegram sign-up to hard-delete. Irreversible.',
  })
  @ValidateIf((o: AdminDeleteUserDto) => o.email === undefined || o.telegram_id !== undefined)
  @Matches(/^\d{1,20}$/)
  telegram_id?: string;
}
