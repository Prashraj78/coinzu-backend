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

  @ApiProperty({ description: 'Whether a verified identity is required to withdraw.' })
  requires_kyc: boolean;

  @ApiProperty({ type: WalletBalanceRatesDto })
  rates: WalletBalanceRatesDto;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}

export class WalletTransactionDto {
  @ApiProperty({ format: 'uuid' })
  cz_wallet_transaction_id: string;

  @ApiProperty({ format: 'uuid' })
  user_id: string;

  @ApiProperty({ enum: ['coin', 'gem'] })
  currency: string;

  @ApiProperty({
    enum: ['earn', 'spend', 'withdrawal', 'convert_in', 'convert_out', 'reversal'],
  })
  type: string;

  @ApiProperty({ example: 1000, description: 'Signed: positive credits, negative debits.' })
  amount: number;

  @ApiProperty({ example: 13000 })
  balance_after: number;

  @ApiProperty({
    enum: [
      'offer',
      'daily_checkin',
      'referral',
      'game',
      'streak',
      'withdrawal',
      'redeem',
      'lucky_draw',
      'achievement',
      'challenge',
      'convert',
      'admin_adjustment',
      'offerwall',
      'welcome_bonus',
    ],
  })
  source_type: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  source_id: string | null;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;
}

export class WalletDto {
  @ApiProperty({ format: 'uuid' })
  cz_user_id: string;

  @ApiProperty({ example: 12500 })
  coin_balance: number;

  @ApiProperty({ example: 12000 })
  gem_balance: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;
}

export class RateCoinDto {
  @ApiProperty({ example: 1000 })
  coins_per_usd: number;

  @ApiProperty({ example: '0.001000' })
  usd_per_coin: string;

  @ApiProperty({ example: '1,000 coins = $1.00' })
  definition: string;
}

export class RateGemDto {
  @ApiProperty({ example: 0.025 })
  coins_per_gem: number;

  @ApiProperty({ example: 40 })
  gems_per_coin: number;

  @ApiProperty({ example: '40 gems = 1 coin' })
  definition: string;
}

export class GemToCoinPreviewDto {
  @ApiProperty({ example: 12000 })
  from_gems: number;

  @ApiProperty({ example: 300 })
  to_coins: number;
}

export class CoinToGemPreviewDto {
  @ApiProperty({ example: 300 })
  from_coins: number;

  @ApiProperty({ example: 12000 })
  to_gems: number;
}

export class GemToCoinDto {
  @ApiProperty({ example: 0.025 })
  rate: number;

  @ApiProperty({ example: 'floor(gems * coins_per_gem)' })
  formula: string;

  @ApiProperty()
  definition: string;

  @ApiProperty({ type: GemToCoinPreviewDto, nullable: true })
  preview: GemToCoinPreviewDto | null;
}

export class CoinToGemDto {
  @ApiProperty({ example: 0.025 })
  rate: number;

  @ApiProperty({ example: 'floor(coins / coins_per_gem)' })
  formula: string;

  @ApiProperty()
  definition: string;

  @ApiProperty({ type: CoinToGemPreviewDto, nullable: true })
  preview: CoinToGemPreviewDto | null;
}

export class RateConvertDto {
  @ApiProperty({ type: GemToCoinDto })
  gem_to_coin: GemToCoinDto;

  @ApiProperty({ type: CoinToGemDto })
  coin_to_gem: CoinToGemDto;
}

export class RateWithdrawalDto {
  @ApiProperty({ example: 5000 })
  min_withdrawal_coins: number;

  @ApiProperty({ example: '5.00' })
  min_withdrawal_usd: string;

  @ApiProperty()
  requires_kyc: boolean;
}

export class WalletRatesDto {
  @ApiProperty({ type: RateCoinDto })
  coin: RateCoinDto;

  @ApiProperty({ type: RateGemDto })
  gem: RateGemDto;

  @ApiProperty({ type: RateConvertDto })
  convert: RateConvertDto;

  @ApiProperty({ type: RateWithdrawalDto })
  withdrawal: RateWithdrawalDto;
}

export class WithdrawalDto {
  @ApiProperty({ format: 'uuid' })
  cz_withdrawal_request_id: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'paid'] })
  status: string;

  @ApiProperty({ example: 10000 })
  amount_coins: number;

  @ApiProperty({ example: '10.00', description: 'amount_coins / coins_per_usd.' })
  gross_usd: string;

  @ApiProperty({ type: String, example: '7.00', nullable: true })
  fee_percent: string | null;

  @ApiProperty({ type: String, example: '0.70', nullable: true })
  fee_usd: string | null;

  @ApiProperty({ type: String, example: '9.30', nullable: true, description: 'USDT actually sent.' })
  payout_usd: string | null;

  @ApiProperty({ type: String, enum: ['BEP20', 'TRC20'], nullable: true })
  network: string | null;

  @ApiProperty({ type: String, nullable: true })
  wallet_address: string | null;

  @ApiProperty({ type: String, nullable: true })
  tx_hash: string | null;

  @ApiProperty({ type: String, nullable: true })
  explorer_url: string | null;

  @ApiProperty({ type: String, nullable: true })
  rejection_reason: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewed_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paid_at: Date | null;
}

export class WithdrawalDestinationDto {
  @ApiProperty({ enum: ['BEP20', 'TRC20'] })
  network: string;

  @ApiProperty()
  wallet_address: string;
}

export class WithdrawalFormDto {
  @ApiProperty({ example: 25000 })
  coin_balance: number;

  @ApiProperty({ example: 1000 })
  coins_per_usd: number;

  @ApiProperty({ example: 5000 })
  min_withdrawal_coins: number;

  @ApiProperty({ example: 25000, description: 'Equal to coin_balance — no other cap.' })
  max_withdrawal_coins: number;

  @ApiProperty({ example: 7 })
  fee_percent: number;

  @ApiProperty()
  requires_kyc: boolean;

  @ApiProperty({ enum: ['none', 'pending', 'verified', 'rejected', 'manual_review'] })
  kyc_status: string;

  @ApiProperty()
  has_pending: boolean;

  @ApiProperty({ type: WithdrawalDto, nullable: true })
  pending: WithdrawalDto | null;

  @ApiProperty({ type: WithdrawalDestinationDto, nullable: true })
  last_destination: WithdrawalDestinationDto | null;

  @ApiProperty({ example: ['BEP20', 'TRC20'] })
  networks: string[];

  @ApiProperty()
  can_withdraw: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['not_web', 'pending_exists', 'kyc_required', 'below_minimum'],
  })
  reason: string | null;
}
