import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { PushMessageDto } from './push-message.dto';

/** A real send to a handful of named accounts, with no campaign recorded. */
export class TestPushDto extends PushMessageDto {
  @ApiProperty({ type: [String], description: 'Up to 10 users to try it on.' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  cz_user_ids: string[];
}
