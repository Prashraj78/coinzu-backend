import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';
import type { WalletCurrency } from '../../../database/entities/wallet-transaction.entity';

export class ConvertCurrencyDto {
  @ApiProperty({ example: 'coin', enum: ['coin', 'gem'] })
  @IsIn(['coin', 'gem'])
  from_currency: WalletCurrency;

  @ApiProperty({ example: 500, description: 'Amount of from_currency to spend.' })
  @IsInt()
  @Min(1)
  amount: number;
}
