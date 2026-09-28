import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceRatesDto {
  @ApiProperty({ example: 1000 })
  coins_per_usd: number;

  @ApiProperty({ example: 0.025 })
  coins_per_gem: number;

  @ApiProperty({ example: 5000 })
  min_withdrawal_coins: number;
}

export class WalletBalanceDto {
  @ApiProperty({ example: 12500 })
  coin_balance: number;

  @ApiProperty({ example: 12000 })
  gem_balance: number;

  @ApiProperty({ example: '12.50' })
  coin_value_usd: string;

  @ApiProperty({ example: 300 })
  gem_value_coins: number;

  @ApiProperty()
  can_withdraw: boolean;

  @ApiProperty({ type: WalletBalanceRatesDto })
  rates: WalletBalanceRatesDto;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}
