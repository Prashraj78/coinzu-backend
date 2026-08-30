import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Which query/body field on the partner's own postback carries each meaning. */
export class OfferwallFieldMappingDto {
  @ApiProperty({ example: 'uid', description: 'Field carrying our cz_user_id.' })
  @IsString()
  @MaxLength(60)
  user_id: string;

  @ApiProperty({ example: 'txn_id', description: "Field carrying the partner's transaction id." })
  @IsString()
  @MaxLength(60)
  external_transaction_id: string;

  @ApiPropertyOptional({ example: 'offer_name' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  offer_name?: string;

  @ApiPropertyOptional({
    example: 'goal_name',
    description: 'Field carrying which milestone/goal was just completed, for multi-step offers.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  milestone_name?: string;

  @ApiPropertyOptional({ example: 'payout' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  payout?: string;

  @ApiPropertyOptional({ example: 'status' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  status?: string;

  @ApiPropertyOptional({ example: '1', description: 'Value of the status field that means approved.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  approved_value?: string;

  @ApiPropertyOptional({ example: '0', description: 'Value of the status field that means reversed.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  reversed_value?: string;
}
