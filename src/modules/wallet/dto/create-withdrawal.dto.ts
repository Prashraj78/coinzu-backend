import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, Min } from 'class-validator';
import type { WithdrawalMethod } from '../../../database/entities/withdrawal-request.entity';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 5000, description: 'Coins to withdraw.' })
  @IsInt()
  @Min(1)
  amount_coins: number;

  @ApiProperty({ example: 'paypal', enum: ['paypal', 'bank', 'crypto'] })
  @IsIn(['paypal', 'bank', 'crypto'])
  method: WithdrawalMethod;

  @ApiProperty({
    example: { paypal_email: 'user@coinzu.app' },
    description: 'Payout account details. Encrypted before it is stored.',
  })
  @IsObject()
  destination_details: Record<string, string>;
}
