import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@coinzu.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePassw0rd' })
  @IsString()
  @MinLength(8)
  password: string;
}
