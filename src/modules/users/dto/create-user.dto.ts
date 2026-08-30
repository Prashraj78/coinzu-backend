import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

/** Used internally by the auth service for both password and Google signup. */
export class CreateUserDto {
  @ApiProperty({ example: 'user@coinzu.app' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'S3curePassw0rd', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ example: '117... (Google subject id)' })
  @IsOptional()
  @IsString()
  google_id?: string;

  @ApiPropertyOptional({ example: 'https://cdn.coinzu.app/avatars/a.png' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  avatar_url?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  email_verified?: boolean;
}
