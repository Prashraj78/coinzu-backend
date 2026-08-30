import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.types';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { RatesQueryDto } from './dto/rates-query.dto';
import { WalletService } from './wallet.service';
import { WithdrawalService } from './withdrawal.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Coin and gem balances with their cash/coin value and live rates',
  })
  getBalance(@CurrentUser() user: RequestUser) {
    return this.walletService.getBalanceSummary(user.cz_user_id);
  }

  @Get('rates')
  @ApiOperation({
    summary:
      'Coin, gem, convert and withdrawal rate definitions, with an optional exact preview',
  })
  getRates(@Query() query: RatesQueryDto) {
    return this.walletService.getRates(query.gem_amount, query.coin_amount);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List wallet transactions, newest first' })
  listTransactions(
    @CurrentUser() user: RequestUser,
    @Query() query: ListQueryDto,
  ) {
    return this.walletService.listTransactions(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert coins to gems or gems to coins' })
  convert(@CurrentUser() user: RequestUser, @Body() dto: ConvertCurrencyDto) {
    return this.walletService.convert(
      user.cz_user_id,
      dto.from_currency,
      dto.amount,
    );
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Request a payout of coins to real money' })
  createWithdrawal(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.create(user.cz_user_id, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List my withdrawal requests' })
  listWithdrawals(
    @CurrentUser() user: RequestUser,
    @Query() query: ListQueryDto,
  ) {
    return this.withdrawalService.listForUser(
      user.cz_user_id,
      query.page,
      query.limit,
    );
  }
}
